import { z } from "zod";
import { bdPhoneSchema } from "./phone";
import { optionalText } from "./form-helpers";

const dayHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  isClosed: z.boolean(),
});

// The WeeklyHoursPicker writes its 7-day array into a hidden JSON input —
// parsed here (never trusting the raw string) into the exact shape
// RestaurantWeeklyHours rows need, so approval can create them directly.
const weeklyHoursJsonSchema = z.preprocess((v) => {
  if (typeof v !== "string" || v === "") return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}, z.array(dayHoursSchema).length(7, "Set hours for all 7 days").optional());

export const vendorApplicationSchema = z.object({
  businessType: z.enum(["GROCERY_VENDOR", "RESTAURANT"], { message: "Choose grocery vendor or restaurant" }),
  businessName: z.string().trim().min(2, "Enter your business name").max(120),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(80),
  phone: bdPhoneSchema,
  email: z.string().trim().email("Enter a valid email"),
  addressText: z.string().trim().min(5, "Enter your business address"),
  deliveryCoverageText: z.string().trim().min(2, "Describe where you can deliver from"),
  productCategories: z.array(z.string()).min(1, "Select at least one category"),
  // Restaurant-only in the wizard UI, and optional there too (real hours are set
  // later in the vendor dashboard) — not rendered at all for grocery vendors.
  openingHoursText: optionalText(z.string().trim()),
  weeklyHoursJson: weeklyHoursJsonSchema,
  businessDescription: optionalText(z.string().trim().max(1000, "Business description must be 1000 characters or less")),
  tradeLicenseNo: z.string().trim().min(1, "Enter your trade licence number"),
  tradeLicenseDocUrl: z.string().min(1, "Upload your trade licence document"),
  nationalIdNo: z.string().trim().min(1, "Enter your National ID number"),
  nationalIdDocUrl: z.string().min(1, "Upload your National ID document"),
  bankOrMfsAccount: z.string().trim().min(3, "Enter a bank or mobile financial account number"),
  logoUrl: optionalText(z.string().url("Logo upload didn't complete — please re-upload")),
  coverImageUrl: optionalText(z.string().url("Cover image upload didn't complete — please re-upload")),
  paymentMethod: z.enum(["BKASH", "NAGAD", "CASH"], { message: "Choose how you paid the registration fee" }),
  paymentReference: z.string().trim().min(1, "Enter the transaction ID (or write \"Cash\" if paid in person)"),
  agreementAccepted: z.literal("1", { message: "You must accept the vendor agreement" }),
});
