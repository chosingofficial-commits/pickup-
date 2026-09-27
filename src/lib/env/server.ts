import "server-only";
import { z } from "zod";

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1")
  .default(false);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SESSION_COOKIE_NAME: z.string().default("pickup_session"),

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
  // not written to an unreliable local filesystem.
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
  SUPPORT_PHONE: z.string().default("+8801700000000"),
  SUPPORT_EMAIL: z.string().default("support@pickup.example"),
  SUPPORT_ADDRESS: z.string().default("Khagrachari Sadar, Khagrachari, Chattogram, Bangladesh"),
  WHATSAPP_NUMBER: z.string().default("+8801700000000"),

  CRON_SECRET: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check .env against .env.example.");
}

export const serverEnv = parsed.data;
