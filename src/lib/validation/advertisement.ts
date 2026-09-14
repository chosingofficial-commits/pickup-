import { z } from "zod";

const PROHIBITED_KEYWORDS = ["cigarette", "vape", "tobacco", "nicotine", "gambling", "casino", "bet", "escort", "adult"];

export const advertisementRequestSchema = z
  .object({
    advertiserName: z.string().trim().min(2, "Enter your name").max(80),
    businessName: z.string().trim().min(2, "Enter your business name").max(120),
    phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
    email: z.string().trim().email("Enter a valid email"),
    title: z.string().trim().min(3, "Enter an advertisement title").max(120),
    description: z.string().trim().min(10, "Describe your advertisement").max(1000),
    targetUrl: z.string().trim().url("Enter a valid URL"),
    preferredPlacementCode: z.enum([
      "HERO_BANNER",
      "BELOW_CATEGORIES_BANNER",
      "BETWEEN_SECTIONS_BANNER",
      "RESTAURANT_PROMO_BANNER",
      "SIDEBAR_BANNER",
      "MOBILE_PROMO_CARD",
      "SPONSORED_VENDOR",
      "SPONSORED_RESTAURANT",
    ]),
    startDate: z.string().min(1, "Choose a start date"),
    endDate: z.string().min(1, "Choose an end date"),
    bannerImageUrl: z.string().url("Upload a banner image"),
    budget: z.coerce.number().positive("Enter a budget"),
    paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "CARD"]),
    agreementAccepted: z.literal("1", { message: "You must accept the advertising terms" }),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  })
  .refine(
    (data) => !PROHIBITED_KEYWORDS.some((kw) => `${data.title} ${data.description}`.toLowerCase().includes(kw)),
    { message: "This advertisement appears to violate our content policy (no tobacco, nicotine, gambling, or adult content).", path: ["description"] },
  );
