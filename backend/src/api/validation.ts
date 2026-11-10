import { z } from "zod";
import { CURRENCIES } from "../engine/currency.ts";

const splitTypeValues = ["equal", "exact", "percentage"] as const;
export const splitTypeSchema = z.enum(splitTypeValues);

export const currencyCode = z
  .string()
  .transform((v) => v.toUpperCase())
  .refine((v) => Boolean(CURRENCIES[v]), { message: "Unsupported currency" });

export const positiveMajor = z.number().positive("Amount must be positive").finite();

export const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Not a valid date" });

export const categorySchema = z.enum([
  "food",
  "accommodation",
  "transport",
  "activities",
  "utilities",
  "housing",
  "shopping",
  "fuel",
  "groceries",
  "entertainment",
  "other",
]);

export const methodSchema = z.enum(["cash", "bank", "payid", "card", "other"]);

const userIdSchema = z.string().min(1);

export const expiresAt = z.string().datetime().optional();

export const demoAuthSchema = z.object({
  username: z.string().trim().min(1).max(40).optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
});

export const userSearchSchema = z.object({
  q: z.string().trim().max(60).optional(),
});

export const createTripSchema = z.object({
  name: z.string().trim().min(1, "Trip name is required").max(80),
  description: z.string().trim().max(300).optional(),
  currencyCode: currencyCode.optional(),
});

export const updateTripSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  currencyCode: currencyCode.optional(),
  simplifyDebts: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  username: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(40).optional(),
  email: z.string().trim().email().optional(),
});

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(120),
  amount: positiveMajor,
  currencyCode: currencyCode.optional(),
  category: categorySchema.default("other"),
  paidByUserId: userIdSchema,
  splitType: splitTypeSchema,
  split: z
    .object({
      among: z.array(userIdSchema).min(1).max(100),
      exact: z.record(z.string(), z.number().min(0)).optional(),
      percentages: z.record(z.string(), z.number().min(0).max(100)).optional(),
    })
    .strict(),
  occurredAt: isoDate.optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const createSettlementSchema = z.object({
  fromUserId: userIdSchema,
  toUserId: userIdSchema,
  amount: positiveMajor,
  method: methodSchema.default("other"),
  note: z.string().trim().max(300).optional(),
});

export const updateSettlementSchema = z.object({
  status: z.enum(["pending", "complete"]).optional(),
  method: methodSchema.optional(),
  note: z.string().trim().max(300).nullable().optional(),
});

export const createRequestSchema = z.object({
  toUserId: userIdSchema,
  amount: positiveMajor,
  message: z.string().trim().max(300).optional(),
});

export const listQuerySchema = z.object({
  simplify: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v === "true" || v === "1" ? true : false)),
});