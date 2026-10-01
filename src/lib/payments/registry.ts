import "server-only";
import { CodAdapter } from "./cod-adapter";
import { MockPaymentAdapter } from "./mock-adapter";
import { BkashAdapter } from "./bkash-adapter";
import { NagadAdapter } from "./nagad-adapter";
import { RocketAdapter } from "./rocket-adapter";
import { SslcommerzAdapter } from "./sslcommerz-adapter";
import { isGatewayLive } from "./gateway-status";
import type { PaymentAdapter } from "./types";
import type { PaymentProvider } from "@/generated/prisma/client";

/**
 * Picks the real gateway adapter only when its credentials are present and
 * its mode is "live" (isGatewayLive — the same check the payment-method
 * admin toggle uses); otherwise falls back to the mock adapter so the app
 * always works end-to-end without real merchant accounts.
 */
export function getPaymentAdapter(provider: PaymentProvider): PaymentAdapter {
  switch (provider) {
    case "COD":
      return new CodAdapter();
    case "BKASH":
      return isGatewayLive("BKASH") ? new BkashAdapter() : new MockPaymentAdapter("BKASH");
    case "NAGAD":
      return isGatewayLive("NAGAD") ? new NagadAdapter() : new MockPaymentAdapter("NAGAD");
    case "ROCKET":
      return isGatewayLive("ROCKET") ? new RocketAdapter() : new MockPaymentAdapter("ROCKET");
    case "SSLCOMMERZ":
      return isGatewayLive("SSLCOMMERZ") ? new SslcommerzAdapter("SSLCOMMERZ") : new MockPaymentAdapter("SSLCOMMERZ");
    case "CARD":
      return isGatewayLive("CARD") ? new SslcommerzAdapter("CARD") : new MockPaymentAdapter("CARD");
    default:
      return new MockPaymentAdapter(provider);
  }
}
