import z from "zod";
const date = z.coerce.date();
export const SemesterValidation = z
  .object({
    name: z.string().trim().min(2).max(100),
    startDate: date,
    endDate: date,
    registrationStart: date,
    registrationEnd: date,
    status: z
      .enum([
        "UPCOMING",
        "REGISTRATION_OPEN",
        "CURRENT",
        "COMPLETED",
        "ARCHIVED",
      ])
      .optional(),
  })
  .refine((value) => value.startDate < value.endDate, {
    message: "endDate must be after startDate",
  })
  .refine((value) => value.registrationStart <= value.registrationEnd, {
    message: "Invalid registration window",
  });
const semesterFields = {
  name: z.string().trim().min(2).max(100),
  startDate: date,
  endDate: date,
  registrationStart: date,
  registrationEnd: date,
  status: z.enum([
    "UPCOMING",
    "REGISTRATION_OPEN",
    "CURRENT",
    "COMPLETED",
    "ARCHIVED",
  ]),
};

export const SemesterUpdateValidation = z
  .object({
    name: semesterFields.name.optional(),
    startDate: semesterFields.startDate.optional(),
    endDate: semesterFields.endDate.optional(),
    registrationStart: semesterFields.registrationStart.optional(),
    registrationEnd: semesterFields.registrationEnd.optional(),
    status: z
      .enum([
        "UPCOMING",
        "REGISTRATION_OPEN",
        "CURRENT",
        "COMPLETED",
        "ARCHIVED",
      ])
      .optional(),
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate < value.endDate,
    { message: "endDate must be after startDate" },
  )
  .refine(
    (value) =>
      !value.registrationStart ||
      !value.registrationEnd ||
      value.registrationStart <= value.registrationEnd,
    { message: "Invalid registration window" },
  );
export const SemesterListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
