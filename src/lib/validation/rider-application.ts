import { z } from "zod";
import { bdPhoneSchema } from "./phone";

export const RIDER_VEHICLE_TYPES = ["BICYCLE", "MOTORBIKE", "OTHER"] as const;

// The NID photo is a raw File, validated separately (size/type/magic-bytes,
// same as every other upload in this codebase) — not part of this schema.
export const riderApplicationSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone: bdPhoneSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    vehicleType: z.enum(RIDER_VEHICLE_TYPES, { message: "Choose a vehicle type" }),
    nationalIdNo: z.string().trim().min(1, "Enter your National ID number").max(40),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
