/**
 * Client-safe environment values. Only NEXT_PUBLIC_* variables may appear
 * here, and each must be referenced as a literal `process.env.NEXT_PUBLIC_*`
 * so Next.js can inline it at build time.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "BDT",
  // Text-based, not the ৳ glyph: keeps English-locale pages from needing
  // the ~108KB Bengali font just to render a currency prefix (see fonts.ts).
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "Tk",
  timezone: process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Dhaka",
  defaultLocale: (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as "en" | "bn") ?? "en",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+8801700000000",
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Pick Up",
  // Web Push's applicationServerKey — safe to expose (it's the whole point
  // of the "public" half of a VAPID keypair). Empty string when unset, which
  // the subscribe flow treats as "push isn't configured on this deploy yet".
  // Trimmed: a value pasted into a host's env var UI (or copied via
  // Set-Clipboard, which can append a trailing newline) can pick up
  // leading/trailing whitespace that silently breaks base64url decoding.
  vapidPublicKey: (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim(),
} as const;
