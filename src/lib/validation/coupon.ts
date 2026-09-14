import { z } from "zod";

export const couponSchema = z.object({
  code: z.string().trim().min(3, "Enter a code").max(30).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().positive("Enter a valid value"),
  minOrderAmount: z.coerce.number().min(0).default(0),
  maxDiscountAmount: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().positive().optional()),
  startsAt: z.string().min(1, "Choose a start date"),
  endsAt: z.string().min(1, "Choose an end date"),
  usageLimit: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  perCustomerLimit: z.coerce.number().int().min(1).default(1),
});
