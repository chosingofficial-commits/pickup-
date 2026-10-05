import { z } from "zod";
import { bdPhoneSchema } from "./phone";
import { optionalText, optionalNumber } from "./form-helpers";

export const coverageRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: bdPhoneSchema,
  addressText: z.string().trim().min(5, "Describe your address or area"),
  lat: optionalNumber(z.coerce.number()),
  lng: optionalNumber(z.coerce.number()),
  divisionText: optionalText(z.string().trim()),
  districtText: optionalText(z.string().trim()),
  upazilaText: optionalText(z.string().trim()),
});
