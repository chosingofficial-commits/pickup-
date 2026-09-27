import { z } from "zod";
import { bdPhoneSchema } from "./phone";

export const vendorApplicationSchema = z.object({
  businessType: z.enum(["GROCERY_VENDOR", "RESTAURANT"]),
  businessName: z.string().trim().min(2, "Enter your business name").max(120),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(80),
  phone: bdPhoneSchema,
  email: z.string().trim().email("Enter a valid email"),
  addressText: z.string().trim().min(5, "Enter your business address"),
  deliveryCoverageText: z.string().trim().min(2, "Describe where you can deliver from"),
  productCategories: z.array(z.string()).min(1, "Select at least one category"),
  openingHoursText: z.string().trim().optional().or(z.literal("")),
  businessDescription: z.string().trim().max(1000).optional().or(z.literal("")),
  tradeLicenseNo: z.string().trim().min(1, "Enter your trade licence number"),
  tradeLicenseDocUrl: z.string().min(1, "Upload your trade licence document"),
  nationalIdNo: z.string().trim().min(1, "Enter your National ID number"),
  nationalIdDocUrl: z.string().min(1, "Upload your National ID document"),
  bankOrMfsAccount: z.string().trim().min(3, "Enter a bank or mobile financial account number"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  paymentMethod: z.enum(["BKASH", "NAGAD", "CASH"], { message: "Choose how you paid the registration fee" }),
  paymentReference: z.string().trim().min(1, "Enter the transaction ID (or write \"Cash\" if paid in person)"),
  agreementAccepted: z.literal("1", { message: "You must accept the vendor agreement" }),
});
