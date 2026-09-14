import { z } from "zod";
import { bdPhoneSchema } from "./phone";

export const riderApplicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: bdPhoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  vehicleType: z.enum(["Bicycle", "Motorcycle", "CNG", "On foot"]),
  licenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  nationalIdDocUrl: z.string().url("Upload your National ID document"),
  agreementAccepted: z.literal("1", { message: "You must accept the rider agreement" }),
});
