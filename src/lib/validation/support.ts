import { z } from "zod";
import { optionalText } from "./form-helpers";

export const supportTicketSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: optionalText(z.string().trim().max(20)),
  subject: z.string().trim().min(3, "Enter a subject").max(120),
  category: z.string().trim().min(1),
  message: z.string().trim().min(10, "Please describe your issue in a bit more detail").max(2000),
});
