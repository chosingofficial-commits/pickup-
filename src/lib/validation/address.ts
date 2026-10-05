import { z } from "zod";
import { bdPhoneSchema } from "./phone";
import { optionalText } from "./form-helpers";

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(30).default("Home"),
  recipientName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  recipientPhone: bdPhoneSchema,
  neighbourhoodId: z.string().min(1, "Choose your area"),
  streetOrVillage: z.string().trim().min(3, "Enter a street, house, or village address"),
  landmark: optionalText(z.string().trim().max(120)),
});
