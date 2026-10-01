import "server-only";
import { serverEnv } from "@/lib/env/server";
import type { PaymentProvider } from "@/generated/prisma/client";

/**
 * Whether this provider's REAL adapter would actually be used right now —
 * live mode AND merchant credentials present — rather than the mock
 * fallback. The single source of truth for "is this gateway really
 * connected": both the adapter registry and the payment-method admin
 * toggle (lib/payments/method-settings.ts) check this, so they can never
 * disagree about whether a provider is real. COD has no gateway and is
 * always considered connected.
 */
export function isGatewayLive(provider: PaymentProvider): boolean {
  switch (provider) {
    case "COD":
      return true;
    case "BKASH":
      return serverEnv.BKASH_MODE === "live" && !!(serverEnv.BKASH_APP_KEY && serverEnv.BKASH_APP_SECRET && serverEnv.BKASH_USERNAME && serverEnv.BKASH_PASSWORD);
    case "NAGAD":
      return serverEnv.NAGAD_MODE === "live" && !!(serverEnv.NAGAD_MERCHANT_ID && serverEnv.NAGAD_MERCHANT_PRIVATE_KEY && serverEnv.NAGAD_PG_PUBLIC_KEY);
    case "ROCKET":
      return serverEnv.ROCKET_MODE === "live" && !!(serverEnv.ROCKET_MERCHANT_ID && serverEnv.ROCKET_MERCHANT_SECRET);
    case "SSLCOMMERZ":
    case "CARD":
      return serverEnv.SSLCOMMERZ_MODE === "live" && !!(serverEnv.SSLCOMMERZ_STORE_ID && serverEnv.SSLCOMMERZ_STORE_PASSWORD);
    default:
      return false;
  }
}
