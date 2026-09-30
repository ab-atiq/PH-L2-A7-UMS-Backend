import crypto from "crypto";
import httpStatus from "http-status";
import Stripe from "stripe";
import type { PaymentStatus as PaymentStatusType } from "../../../generated/prisma/enums.js";
import {
  AuditAction,
  InvoiceStatus,
  PaymentGateway,
  PaymentStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { getBkashIdToken } from "../../lib/bkash.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { InitiatePaymentData } from "./payment.interface.js";

const getStripe = () => {
  if (!config.stripe_secret_key) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Stripe is not configured",
    );
  }
  return new Stripe(config.stripe_secret_key);
};

const getCheckoutUrl = (path: string) => {
  const baseUrl =
    config.backend_url ?? `http://localhost:${config.port ?? 5000}`;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
};

const createCheckoutSession = async (userId: string, invoiceId: string) => {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: invoiceId, studentId: student.id, deletedAt: null },
    include: {
      payments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  if (
    invoice.status === InvoiceStatus.PAID ||
    invoice.payments.some((payment) => payment.status === PaymentStatus.SUCCESS)
  ) {
    throw new AppError(httpStatus.CONFLICT, "Invoice is already paid");
  }
  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is cancelled");
  }
  if (new Date() > invoice.dueDate) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is past due");
  }
  if (
    invoice.payments.some(
      (payment) =>
        payment.status === PaymentStatus.INITIATED ||
        payment.status === PaymentStatus.PENDING,
    )
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A payment is already in progress for this invoice",
    );
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(invoice.amount) * 100),
          product_data: { name: `University invoice ${invoice.invoiceNumber}` },
        },
        quantity: 1,
      },
    ],
    success_url: `${getCheckoutUrl("/api/v1/payments/success")}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getCheckoutUrl("/api/v1/payments/cancel")}?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { invoiceId: invoice.id, studentId: student.id },
  });

  const payment = await prisma.payment.create({
    data: {
      transactionId: session.id,
      invoiceId: invoice.id,
      studentId: student.id,
      amount: invoice.amount,
      gateway: PaymentGateway.STRIPE,
      status: PaymentStatus.PENDING,
    },
  });

  return { paymentUrl: session.url, payment };
};

const updateCheckoutPayment = async (
  sessionId: string,
  status: PaymentStatusType,
) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: sessionId },
    include: { invoice: true },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (payment.status === PaymentStatus.SUCCESS) return payment;
  if (
    status === PaymentStatus.SUCCESS &&
    payment.amount.toString() !== payment.invoice.amount.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment amount does not match invoice",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...(status === PaymentStatus.SUCCESS ? { paidAt: new Date() } : {}),
        gatewayReference: sessionId,
      },
    });
    if (status === PaymentStatus.SUCCESS) {
      await tx.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: InvoiceStatus.PAID },
      });
    }
    return updated;
  });
};

const completeCheckout = async (sessionId: string) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe payment is not completed",
    );
  }
  return updateCheckoutPayment(session.id, PaymentStatus.SUCCESS);
};

const cancelCheckout = async (sessionId: string) => {
  await getStripe().checkout.sessions.retrieve(sessionId);
  return updateCheckoutPayment(sessionId, PaymentStatus.CANCELLED);
};

const getBkashCallbackUrl = () =>
  `${(config.backend_url ?? `http://localhost:${config.port ?? 5000}`).replace(/\/$/, "")}/api/v1/payments/bkash/callback`;

const createBkashPayment = async (userId: string, invoiceId: string) => {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: invoiceId, studentId: student.id, deletedAt: null },
    include: { payments: { where: { deletedAt: null } } },
  });
  if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  if (
    invoice.status === InvoiceStatus.PAID ||
    invoice.payments.some((payment) => payment.status === PaymentStatus.SUCCESS)
  ) {
    throw new AppError(httpStatus.CONFLICT, "Invoice is already paid");
  }
  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is cancelled");
  }
  if (new Date() > invoice.dueDate) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is past due");
  }
  if (
    invoice.payments.some(
      (payment) =>
        payment.status === PaymentStatus.INITIATED ||
        payment.status === PaymentStatus.PENDING,
    )
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A payment is already in progress for this invoice",
    );
  }

  const transactionId = `TXN-${crypto.randomUUID()}`;
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      invoiceId: invoice.id,
      studentId: student.id,
      amount: invoice.amount,
      gateway: PaymentGateway.BKASH,
      status: PaymentStatus.INITIATED,
    },
  });

  try {
    const gatewayResponse = await createBkashGatewayPayment(
      transactionId,
      invoice.amount.toString(),
      userId,
    );
    if (
      typeof gatewayResponse.paymentID !== "string" ||
      typeof gatewayResponse.bkashURL !== "string"
    ) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Invalid bKash payment response",
      );
    }
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PENDING,
        gatewayReference: gatewayResponse.paymentID,
        gatewayResponse: gatewayResponse as any,
      },
    });
    return { payment: updated, paymentUrl: gatewayResponse.bkashURL };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: {
          error: error instanceof Error ? error.message : "Gateway error",
        },
      },
    });
    throw error;
  }
};

const handleBkashCallback = async (query: Record<string, unknown>) => {
  const paymentId =
    typeof query.paymentID === "string" ? query.paymentID : undefined;
  const status =
    typeof query.status === "string" ? query.status.toLowerCase() : undefined;
  if (!paymentId) {
    throw new AppError(httpStatus.BAD_REQUEST, "bKash payment id is missing");
  }
  if (!status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "bKash payment status is missing",
    );
  }

  const payment = await prisma.payment.findFirst({
    where: { gatewayReference: paymentId, gateway: PaymentGateway.BKASH },
    include: { invoice: true },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  if (payment.status === PaymentStatus.SUCCESS) {
    return { redirectUrl: `${config.frontend_url}/payments?status=success` };
  }

  if (status !== "success") {
    const paymentStatus =
      status === "cancel" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatus, gatewayResponse: query as any },
    });
    return {
      redirectUrl: `${config.frontend_url}/payments?status=${status === "cancel" ? "cancel" : "failed"}`,
    };
  }

  const token = await getBkashIdToken();
  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({ paymentID: paymentId }),
    },
  );
  const executed = (await response.json()) as Record<string, any>;
  if (!response.ok || executed.status !== "Completed") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, gatewayResponse: executed },
    });
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "bKash payment execution failed",
    );
  }
  if (Number(executed.amount) !== Number(payment.amount)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment amount does not match invoice",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayReference: paymentId,
        gatewayResponse: executed,
        paidAt: executed.paymentExecuteTime
          ? new Date(executed.paymentExecuteTime)
          : new Date(),
      },
    });
    await tx.feeInvoice.update({
      where: { id: payment.invoiceId },
      data: { status: InvoiceStatus.PAID },
    });
  });

  return { redirectUrl: `${config.frontend_url}/payments?status=success` };
};

const createBkashGatewayPayment = async (
  transactionId: string,
  amount: string,
  payerReference = transactionId,
) => {
  const requiredConfig = [
    config.bkash_base_url,
    config.bkash_username,
    config.bkash_password,
    config.bkash_app_key,
    config.bkash_app_secret,
  ];
  if (
    requiredConfig.some(
      (value) =>
        !value ||
        value.startsWith("your_bkash_") ||
        value.includes("your-public-domain"),
    )
  ) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "bKash is not configured",
    );
  }
  const tokenResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: config.bkash_username,
        password: config.bkash_password,
      },
      body: JSON.stringify({
        app_key: config.bkash_app_key,
        app_secret: config.bkash_app_secret,
      }),
    },
  );
  if (!tokenResponse.ok) {
    const error = (await tokenResponse.json().catch(() => null)) as {
      errorCode?: string;
      errorMessage?: string;
    } | null;
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `bKash token grant failed${
        error?.errorCode || error?.errorMessage
          ? `: ${error.errorCode ?? ""} ${error.errorMessage ?? ""}`.trim()
          : ` with HTTP ${tokenResponse.status}`
      }`,
    );
  }

  const token = ((await tokenResponse.json()) as { id_token?: string })
    .id_token;

  if (!token) {
    throw new AppError(httpStatus.BAD_GATEWAY, "bKash token was not returned");
  }

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference,
        callbackURL: getBkashCallbackUrl(),
        amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: transactionId,
      }),
    },
  );

  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, "bKash payment creation failed");
  }

  return (await response.json()) as Record<string, unknown>;
};

const initiate = async (userId: string, data: InitiatePaymentData) => {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: data.invoiceId, studentId: student.id, deletedAt: null },
    include: { payments: { where: { status: PaymentStatus.SUCCESS } } },
  });
  if (!invoice) {
    throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  }
  if (invoice.status === InvoiceStatus.PAID || invoice.payments.length) {
    throw new AppError(httpStatus.CONFLICT, "Invoice is already paid");
  }
  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is cancelled");
  }
  if (new Date() > invoice.dueDate) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invoice is past due");
  }
  if (data.gateway !== PaymentGateway.BKASH) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This gateway is not configured for real payments",
    );
  }
  const transactionId = `TXN-${crypto.randomUUID()}`;
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      invoiceId: invoice.id,
      studentId: student.id,
      amount: invoice.amount,
      gateway: data.gateway,
      status: PaymentStatus.INITIATED,
    },
  });

  try {
    const gatewayResponse = await createBkashGatewayPayment(
      transactionId,
      invoice.amount.toString(),
    );
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PENDING,
        ...(typeof gatewayResponse.paymentID === "string"
          ? { gatewayReference: gatewayResponse.paymentID }
          : {}),
        gatewayResponse: gatewayResponse as any,
      },
    });
    return { payment: updated, redirectUrl: gatewayResponse.bkashURL ?? null };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: {
          error: error instanceof Error ? error.message : "Gateway error",
        },
      },
    });
    throw error;
  }
};

const processWebhook = async (payload: any, signature?: string) => {
  if (config.payment_webhook_secret) {
    const expected = crypto
      .createHmac("sha256", config.payment_webhook_secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    )
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid payment webhook signature",
      );
  } else if (config.node_env === "production")
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Payment webhook secret is not configured",
    );
  const payment = await prisma.payment.findUnique({
    where: { transactionId: payload.transactionId },
    include: { invoice: true },
  });
  if (!payment)
    throw new AppError(httpStatus.NOT_FOUND, "Payment transaction not found");
  if (payment.status === PaymentStatus.SUCCESS) return payment;
  const status =
    payload.status === "SUCCESS"
      ? PaymentStatus.SUCCESS
      : payload.status === "FAILED"
        ? PaymentStatus.FAILED
        : payload.status === "CANCELLED"
          ? PaymentStatus.CANCELLED
          : PaymentStatus.PENDING;
  if (
    status === PaymentStatus.SUCCESS &&
    payment.amount.toString() !== payment.invoice.amount.toString()
  )
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment amount does not match invoice",
    );
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...(payload.gatewayReference
          ? { gatewayReference: payload.gatewayReference }
          : {}),
        gatewayResponse: payload.gatewayResponse ?? payload,
        ...(status === PaymentStatus.SUCCESS ? { paidAt: new Date() } : {}),
      },
    });
    if (status === PaymentStatus.SUCCESS)
      await tx.feeInvoice.update({
        where: { id: payment.invoiceId },
        data: { status: InvoiceStatus.PAID },
      });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: AuditAction.UPDATE_PAYMENT_STATUS,
        entity: "Payment",
        entityId: payment.id,
        metadata: payload.gatewayResponse ?? payload,
      },
    });
    return updated;
  });
};

const getById = async (userId: string, role: Role, id: string) => {
  const student =
    role === Role.STUDENT
      ? await prisma.studentProfile.findUnique({ where: { userId } })
      : null;
  if (role === Role.STUDENT && !student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(student ? { studentId: student.id } : {}),
    },
    include: { invoice: true },
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  return payment;
};
export const PaymentService = {
  initiate,
  processWebhook,
  createCheckoutSession,
  completeCheckout,
  cancelCheckout,
  createBkashPayment,
  handleBkashCallback,
  getById,
};
