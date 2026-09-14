import { z } from "zod";
import { bdPhoneSchema } from "./phone";

export const coverageRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: bdPhoneSchema,
  addressText: z.string().trim().min(5, "Describe your address or area"),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  divisionText: z.string().trim().optional(),
  districtText: z.string().trim().optional(),
  upazilaText: z.string().trim().optional(),
});
