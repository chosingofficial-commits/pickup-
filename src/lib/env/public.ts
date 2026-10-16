// Public half of the production VAPID keypair — safe to hardcode: that's
// the whole point of a VAPID keypair's "public" half (the private half,
// WEB_PUSH_SECRET, must never appear in source). Baked in here so this one
// fewer var needs to survive hPanel's env var count — NEXT_PUBLIC_VAPID_PUBLIC_KEY
// still overrides it when set (e.g. for a deploy using a different keypair).
const DEFAULT_VAPID_PUBLIC_KEY = "BDfRJjvVrcEwZ8Y_90B2DJQsrhPJdVBddanfdqV-ofbcRNxHSDNjcXvjC6NnI5ORaSU2bqX1r8snO5Dpmsk1lgM";

// `?? DEFAULT` alone only catches the var being genuinely absent — a host
// env-var UI can also leave a var present-but-blank ("" or whitespace),
// which `??` does NOT treat as missing (only null/undefined trigger it),
// silently producing an empty key instead of falling back. Treat both the
// same.
function blankToUndefined(value: string | undefined): string | undefined {
  return value !== undefined && value.trim() !== "" ? value : undefined;
}

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
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+8801310790678",
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Pick Up",
  // Web Push's applicationServerKey — safe to expose (it's the whole point
  // of the "public" half of a VAPID keypair). Empty string when unset, which
  // the subscribe flow treats as "push isn't configured on this deploy yet".
  // Trimmed: a value pasted into a host's env var UI (or copied via
  // Set-Clipboard, which can append a trailing newline) can pick up
  // leading/trailing whitespace that silently breaks base64url decoding.
  vapidPublicKey: (blankToUndefined(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ?? DEFAULT_VAPID_PUBLIC_KEY).trim(),
} as const;
