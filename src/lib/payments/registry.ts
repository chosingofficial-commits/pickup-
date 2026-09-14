import "server-only";
import { serverEnv } from "@/lib/env/server";
import { CodAdapter } from "./cod-adapter";
import { MockPaymentAdapter } from "./mock-adapter";
import { BkashAdapter } from "./bkash-adapter";
import { NagadAdapter } from "./nagad-adapter";
import { RocketAdapter } from "./rocket-adapter";
import { SslcommerzAdapter } from "./sslcommerz-adapter";
import type { PaymentAdapter } from "./types";
import type { PaymentProvider } from "@/generated/prisma/client";

function hasBkashCredentials() {
  return !!(serverEnv.BKASH_APP_KEY && serverEnv.BKASH_APP_SECRET && serverEnv.BKASH_USERNAME && serverEnv.BKASH_PASSWORD);
}
function hasSslcommerzCredentials() {
  return !!(serverEnv.SSLCOMMERZ_STORE_ID && serverEnv.SSLCOMMERZ_STORE_PASSWORD);
}
function hasNagadCredentials() {
  return !!(serverEnv.NAGAD_MERCHANT_ID && serverEnv.NAGAD_MERCHANT_PRIVATE_KEY && serverEnv.NAGAD_PG_PUBLIC_KEY);
}
function hasRocketCredentials() {
  return !!(serverEnv.ROCKET_MERCHANT_ID && serverEnv.ROCKET_MERCHANT_SECRET);
}

/**
 * Picks the real gateway adapter only when its credentials are present and
 * its mode is "live"; otherwise falls back to the mock adapter so the app
 * always works end-to-end without real merchant accounts.
 */
export function getPaymentAdapter(provider: PaymentProvider): PaymentAdapter {
  switch (provider) {
    case "COD":
      return new CodAdapter();
    case "BKASH":
      return serverEnv.BKASH_MODE === "live" && hasBkashCredentials() ? new BkashAdapter() : new MockPaymentAdapter("BKASH");
    case "NAGAD":
      return serverEnv.NAGAD_MODE === "live" && hasNagadCredentials() ? new NagadAdapter() : new MockPaymentAdapter("NAGAD");
    case "ROCKET":
      return serverEnv.ROCKET_MODE === "live" && hasRocketCredentials() ? new RocketAdapter() : new MockPaymentAdapter("ROCKET");
    case "SSLCOMMERZ":
      return serverEnv.SSLCOMMERZ_MODE === "live" && hasSslcommerzCredentials()
        ? new SslcommerzAdapter("SSLCOMMERZ")
        : new MockPaymentAdapter("SSLCOMMERZ");
    case "CARD":
      return serverEnv.SSLCOMMERZ_MODE === "live" && hasSslcommerzCredentials()
        ? new SslcommerzAdapter("CARD")
        : new MockPaymentAdapter("CARD");
    default:
      return new MockPaymentAdapter(provider);
  }
}
