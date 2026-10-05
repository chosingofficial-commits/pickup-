import { z } from "zod";
import { bdPhoneSchema } from "./phone";
import { optionalText } from "./form-helpers";

export const loginSchema = z.object({
  phone: bdPhoneSchema,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone: bdPhoneSchema,
    email: optionalText(z.string().trim().email("Enter a valid email")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
