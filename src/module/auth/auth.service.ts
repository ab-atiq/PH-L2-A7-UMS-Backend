import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import type { SignOptions } from "jsonwebtoken";
import path from "path";
import { Role, UserStatus } from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { googleClient } from "../../lib/googleAuth.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";
import { ensureRedisConnection, redisClient } from "../../lib/redis.js";
import { AppError } from "../../utils/AppError.js";
import { jwtUtils } from "../../utils/jwt.js";
import type {
  IForgotPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterStudentPayload,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface.js";

const OTP_TTL_SECONDS = 5 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  googleId: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
const getDisplayName = (user: { firstName: string; lastName: string }) =>
  `${user.firstName} ${user.lastName}`.trim();

const ensureActiveUser = (user: {
  status: UserStatus;
  deletedAt: Date | null;
}) => {
  if (user.deletedAt)
    throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
  if (user.status === UserStatus.SUSPENDED)
    throw new AppError(httpStatus.FORBIDDEN, "Your account has been suspended");
  if (user.status === UserStatus.INACTIVE)
    throw new AppError(httpStatus.FORBIDDEN, "Your account is inactive");
};

const createTokens = async (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}) => {
  const payload = {
    userId: user.id,
    email: user.email,
    name: getDisplayName(user),
    role: user.role,
  };
  const accessToken = jwtUtils.createToken(
    payload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    payload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { accessToken, refreshToken };
};

const registerStudent = async (payload: IRegisterStudentPayload) => {
  const email = payload.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const passwordHash = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );
  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `student-registration:${email}`;

  await ensureRedisConnection();
  await redisClient.set(
    key,
    JSON.stringify({ ...payload, email, passwordHash, otp }),
    { expiration: { type: "EX", value: OTP_TTL_SECONDS } },
  );

  const html = await ejs.renderFile(
    path.join(process.cwd(), "src/templates/registration-student-otp.ejs"),
    {
      name: `${payload.firstName} ${payload.lastName}`,
      email,
      otp,
      expirationMinutes: 5,
    },
  );

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "University account verification",
    html,
  });
};

const verifyStudentEmail = async (payload: IVerifyEmailPayload) => {
  const email = payload.email.trim().toLowerCase();
  const key = `student-registration:${email}`;

  await ensureRedisConnection();
  const rawRegistration = await redisClient.get(key);
  if (!rawRegistration)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Verification code is invalid or expired",
    );

  const registration = JSON.parse(
    rawRegistration,
  ) as IRegisterStudentPayload & { passwordHash: string; otp: string };
  if (registration.otp !== payload.otp)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Verification code does not match",
    );

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: registration.passwordHash,
      firstName: registration.firstName,
      lastName: registration.lastName,
      ...(registration.phone ? { phone: registration.phone } : {}),
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    select: publicUserSelect,
  });
  await redisClient.del(key);
  return { user, ...(await createTokens(user)) };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
  }

  if (!user.passwordHash) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "User does not have a password set. Please use Google login.",
    );
  }

  if (!user.emailVerified || user.status === UserStatus.PENDING_VERIFICATION) {
    console.log("loginUser: Invalid credentials 2");
    throw new AppError(httpStatus.FORBIDDEN, "Please verify your email first");
  }

  // Ensure the user is active
  ensureActiveUser(user);

  if (!(await bcrypt.compare(payload.password, user.passwordHash))) {
    console.log("loginUser: Invalid credentials 3");
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  // at most 2 active refresh tokens per user. if there are already 2 refresh tokens then confirm from user that user want to delete previous all refresh token or stop create this refresh token before creating a new one.

  // const activeTokens = await prisma.refreshToken.findMany({
  //   where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
  // });

  // if (activeTokens.length >= 2) {
  //   // Confirm from user before deleting existing refresh tokens
  //   throw new AppError(
  //     httpStatus.CONFLICT,
  //     "You have reached the limit of active refresh tokens. Please revoke an existing token before creating a new one.",
  //   );
  // }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return createTokens(user);
};

// const getMe = async (requestUser: IRequestUser) => {
//   const user = await prisma.user.findUnique({
//     where: { id: requestUser.userId },
//     select: { ...publicUserSelect, studentProfile: true, facultyProfile: true },
//   });
//   if (!user) {
//     throw new AppError(httpStatus.NOT_FOUND, "User not found");
//   }
//   return user;
// };

const refreshToken = async (token: string) => {
  const verified = jwtUtils.verifyToken(token, config.jwt_refresh_secret);
  if (!verified.success || !verified.data) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (
    !storedToken ||
    storedToken.revoked ||
    storedToken.expiresAt <= new Date()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Refresh token is expired or revoked",
    );
  }

  ensureActiveUser(storedToken.user);

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true, revokedAt: new Date() },
  });
  return createTokens(storedToken.user);
};

const logout = async (token?: string) => {
  if (!token) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googlePayload: TokenPayload | undefined;

  try {
    googlePayload = (
      await googleClient.verifyIdToken({
        idToken: payload.idToken,
        audience: config.google_client_id,
      })
    ).getPayload();
  } catch {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired Google ID token",
    );
  }

  if (!googlePayload?.email || !googlePayload.sub) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Google account information is incomplete",
    );
  }

  let user = await prisma.user.findUnique({
    where: { googleId: googlePayload.sub },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: googlePayload.email.toLowerCase() },
    });
  }

  if (user) {
    ensureActiveUser(user);
    if (!user.googleId)
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googlePayload.sub, emailVerified: true },
      });
  } else {
    const [firstName, ...lastNameParts] = (
      googlePayload.name || "Student User"
    ).split(" ");
    user = await prisma.user.create({
      data: {
        email: googlePayload.email.toLowerCase(),
        firstName: googlePayload.given_name || firstName || "Student",
        lastName:
          googlePayload.family_name || lastNameParts.join(" ") || "User",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        googleId: googlePayload.sub,
      },
    });
  }
  return createTokens(user);
};

const forgotPassword = async ({ email: rawEmail }: IForgotPasswordPayload) => {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  ensureActiveUser(user);
  if (user.googleId && !user.passwordHash) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Google accounts cannot reset a password",
    );
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `password-reset:${email}`;
  await ensureRedisConnection();
  await redisClient.set(key, otp, {
    expiration: { type: "EX", value: OTP_TTL_SECONDS },
  });
  const html = await ejs.renderFile(
    path.join(process.cwd(), "src/templates/forgot-password.ejs"),
    { name: getDisplayName(user), otp, expirationMinutes: 5 },
  );

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Reset your password",
    html,
  });
};

const resetPassword = async ({
  email: rawEmail,
  otp,
  newPassword,
}: IResetPasswordPayload) => {
  const email = rawEmail.trim().toLowerCase();

  const key = `password-reset:${email}`;
  await ensureRedisConnection();
  const storedOtp = await redisClient.get(key);
  if (!storedOtp || storedOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid verification code");
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  ensureActiveUser(user);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(
        newPassword,
        Number(config.bcrypt_salt_rounds || 10),
      ),
    },
  });
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });
  await redisClient.del(key);
};

export const AuthService = {
  registerStudent,
  verifyStudentEmail,
  loginUser,
  refreshToken,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword,
};
