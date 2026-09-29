import { z } from "zod";

const PROHIBITED_KEYWORDS = ["cigarette", "vape", "tobacco", "nicotine", "gambling", "casino", "bet", "escort", "adult"];

export const advertisementRequestSchema = z
  .object({
    businessName: z.string().trim().min(2, "Enter your business name").max(120),
    phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
    targetUrl: z
      .string()
      .trim()
      .url("Enter a valid link")
      .refine((url) => url.startsWith("http://") || url.startsWith("https://"), { message: "Link must start with http:// or https://" }),
    // A private-bucket storage key (see /api/uploads), not a public URL —
    // nothing is publicly reachable until admin approval copies it out.
    pendingBannerImageKey: z.string().min(1, "Upload an ad image"),
    placementCode: z.string().min(1, "Choose a placement"),
    startDate: z.string().min(1, "Choose a start date"),
    endDate: z.string().min(1, "Choose an end date"),
    agreementAccepted: z.literal("1", { message: "You must accept the advertising policy" }),
    ownsContent: z.literal("1", { message: "You must confirm you own or have permission to use this image and its content" }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  })
  .refine((data) => !PROHIBITED_KEYWORDS.some((kw) => data.businessName.toLowerCase().includes(kw)), {
    message: "This advertisement appears to violate our content policy (no tobacco, nicotine, gambling, or adult content).",
    path: ["businessName"],
  });
