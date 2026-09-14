/**
 * Client-safe environment values. Only NEXT_PUBLIC_* variables may appear
 * here, and each must be referenced as a literal `process.env.NEXT_PUBLIC_*`
 * so Next.js can inline it at build time.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "BDT",
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "৳",
  timezone: process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Dhaka",
  defaultLocale: (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as "en" | "bn") ?? "en",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+8801700000000",
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Pick Up",
} as const;
