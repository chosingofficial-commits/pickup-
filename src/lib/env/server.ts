import "server-only";
import { z } from "zod";

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1")
  .default(false);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Derived from NEXT_PUBLIC_APP_URL below when unset (see the preprocessing
  // before safeParse) — one URL, not two separate vars to keep in sync. Set
  // APP_URL explicitly only if the server-side URL must differ from the
  // public one (an unusual setup), which is why it's still its own field.
  APP_URL: z.string().url().default("http://localhost:3000"),
  // Used by `prisma migrate deploy` (via prisma.config.ts) and as the
  // runtime fallback below — needs a session/direct connection (e.g.
  // Supabase's session pooler, port 5432), since migrations need
  // session-level behavior that a transaction-mode pooler doesn't support.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Optional: the connection the RUNNING APP queries through — point this
  // at a transaction-mode pooler (e.g. Supabase's pooler on port 6543,
  // `?pgbouncer=true`) in production, which multiplexes many app-side
  // connections onto far fewer real Postgres backends than a session
  // pooler's low client cap allows. Falls back to DATABASE_URL when unset
  // (e.g. local dev against a single local Postgres — see src/lib/db.ts).
  DATABASE_POOL_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SESSION_COOKIE_NAME: z.string().default("pickup_session"),

  // Host-based routing to vendor./rider./admin.<APP_URL's hostname> — see
  // src/proxy.ts and src/lib/subdomains.ts. Off by default: the instant
  // rollback for a subdomain-routing problem in production is flipping this
  // back to false and restarting, no redeploy needed. proxy.ts itself reads
  // process.env directly (never coupled to this schema finishing validation),
  // but it's declared here too so it shows up in .env.example and anywhere
  // else that introspects serverEnv.
  ENABLE_SUBDOMAIN_ROUTING: boolFromString,

  // Platform defaults — configurable, never hard-coded into business logic.
  DEFAULT_TIMEZONE: z.string().default("Asia/Dhaka"),
  DEFAULT_CURRENCY: z.string().default("BDT"),
  DEFAULT_COMMISSION_RATE_PCT: z.coerce.number().default(10),

  // Age-restricted (tobacco) module — disabled unless explicitly enabled
  // after legal/compliance review.
  TOBACCO_SALES_ENABLED: boolFromString,
  TOBACCO_MINIMUM_AGE: z.coerce.number().default(18),
  TOBACCO_EXCLUSION_RADIUS_METERS: z.coerce.number().default(100),

  // Google Maps (server-side key, restricted to server APIs e.g. Geocoding)
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),

  // Payments — all optional; adapters fall back to sandbox/mock mode when
  // credentials are absent.
  BKASH_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  BKASH_APP_KEY: z.string().optional(),
  BKASH_APP_SECRET: z.string().optional(),
  BKASH_USERNAME: z.string().optional(),
  BKASH_PASSWORD: z.string().optional(),

  NAGAD_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  NAGAD_MERCHANT_ID: z.string().optional(),
  NAGAD_MERCHANT_PRIVATE_KEY: z.string().optional(),
  NAGAD_PG_PUBLIC_KEY: z.string().optional(),

  ROCKET_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  ROCKET_MERCHANT_ID: z.string().optional(),
  ROCKET_MERCHANT_SECRET: z.string().optional(),

  SSLCOMMERZ_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),

  // SMS
  SMS_PROVIDER: z.enum(["mock", "twilio", "custom"]).default("mock"),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),

  // Email
  EMAIL_PROVIDER: z.enum(["mock", "smtp"]).default("mock"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("Pick Up <no-reply@pickup.example>"),

  // Object storage (S3-compatible) — required in production so uploads are
  // not written to an unreliable local filesystem. STORAGE_PROVIDER,
  // S3_REGION, S3_BUCKET, S3_PRIVATE_BUCKET and S3_FORCE_PATH_STYLE all have
  // production-safe defaults baked in below (see the preprocessing before
  // safeParse) matching this deploy's actual Supabase Storage setup, so none
  // of those five need to be set in hPanel anymore — only the real secrets
  // (S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY) and the two values with no safe
  // guessable default (S3_ENDPOINT, S3_PUBLIC_URL_BASE) still need to be.
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PRIVATE_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL_BASE: z.string().optional(),
  S3_FORCE_PATH_STYLE: boolFromString,

  // Support / contact defaults, seeded into SiteSetting on first run.
  SUPPORT_PHONE: z.string().default("+8801310790678"),
  SUPPORT_EMAIL: z.string().default("support@pickup.example"),
  SUPPORT_ADDRESS: z.string().default("Khagrachari Sadar, Khagrachari, Chattogram, Bangladesh"),
  WHATSAPP_NUMBER: z.string().default("+8801310790678"),

  CRON_SECRET: z.string().optional(),

  // Web Push (vendor/rider order alerts) — see src/lib/push/send.ts. Optional:
  // sendPushToUser() no-ops (logged once) when unset, so a deploy without
  // this configured yet keeps working exactly as before, just without push.
  // Trimmed: a value pasted into a host's env var UI (or copied via
  // Set-Clipboard, which can append a trailing newline) can pick up
  // leading/trailing whitespace that silently breaks base64url decoding.
  //
  // The VAPID private key's ONLY accepted name now. Diagnostics confirmed
  // VAPID_PRIVATE_KEY never reached this process's runtime environment at
  // all (while unrelated vars like DATABASE_URL and AUTH_SECRET do), even
  // right after a build that correctly picked up NEXT_PUBLIC_VAPID_PUBLIC_KEY
  // — turned out to be this host's env vars only reaching the running
  // process in the order they were added, capped well below the total
  // count that had built up (see getVapidEnvDiagnostics' control group).
  // The "PRIVATE_KEY" fallback was dropped once that was confirmed, rather
  // than kept as a second thing to go stale.
  WEB_PUSH_SECRET: z.string().trim().optional(),
  VAPID_SUBJECT: z.string().trim().default("mailto:information@pickupn.com"),
});

// A plain `??` (or zod's own `.default(...)`) only falls back when a var is
// genuinely absent (null/undefined) — a host env-var UI can also leave a
// var present-but-blank ("" or whitespace), which neither of those treats
// as missing, silently producing an empty value instead of the intended
// default. Every fallback below goes through this first so blank counts
// the same as unset.
function blankToUndefined(value: string | undefined): string | undefined {
  return value !== undefined && value.trim() !== "" ? value : undefined;
}

// A few fields are given production-safe fallbacks here, in front of
// safeParse, rather than as a plain zod .default(...) — because the
// fallback must apply ONLY when the real var is genuinely absent (or
// blank — see blankToUndefined), and in APP_URL's case the fallback is
// computed FROM another env var, not a constant. Keeping this in one place
// (rather than scattering fallbacks across every file that reads these) is
// also what let each of these stop needing its own line in hPanel.
const isProduction = process.env.NODE_ENV === "production";
const rawEnv = {
  ...process.env,
  // One URL to set (NEXT_PUBLIC_APP_URL, which is build-time inlined
  // anyway) instead of two kept in sync by hand.
  APP_URL: blankToUndefined(process.env.APP_URL) ?? blankToUndefined(process.env.NEXT_PUBLIC_APP_URL),
  // Matches this deploy's actual Supabase Storage setup — see the
  // STORAGE_PROVIDER doc comment above. Only applied in production so
  // local dev's deliberate "local" default (see .env.example) is untouched.
  STORAGE_PROVIDER: blankToUndefined(process.env.STORAGE_PROVIDER) ?? (isProduction ? "s3" : undefined),
  S3_REGION: blankToUndefined(process.env.S3_REGION) ?? "ap-south-1",
  S3_BUCKET: blankToUndefined(process.env.S3_BUCKET) ?? "pickup-uploads",
  S3_PRIVATE_BUCKET: blankToUndefined(process.env.S3_PRIVATE_BUCKET) ?? "pickup_documents",
  S3_FORCE_PATH_STYLE: blankToUndefined(process.env.S3_FORCE_PATH_STYLE) ?? "true",
  VAPID_SUBJECT: blankToUndefined(process.env.VAPID_SUBJECT),
};

const parsed = serverEnvSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check .env against .env.example.");
}

export const serverEnv = parsed.data;
