import "server-only";
import type { PaymentProvider } from "@/generated/prisma/client";
import { SITE_SETTING_KEYS } from "@/lib/settings";
import { isGatewayLive } from "./gateway-status";

export const PAYMENT_METHOD_PROVIDERS: PaymentProvider[] = ["COD", "BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "CARD"];

export const PAYMENT_METHOD_LABELS: Record<PaymentProvider, string> = {
  COD: "Cash on delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  SSLCOMMERZ: "SSLCommerz",
  CARD: "Debit / Credit card",
};

const PROVIDER_SETTING_KEY: Record<PaymentProvider, string> = {
  COD: SITE_SETTING_KEYS.paymentMethodEnabledCod,
  BKASH: SITE_SETTING_KEYS.paymentMethodEnabledBkash,
  NAGAD: SITE_SETTING_KEYS.paymentMethodEnabledNagad,
  ROCKET: SITE_SETTING_KEYS.paymentMethodEnabledRocket,
  SSLCOMMERZ: SITE_SETTING_KEYS.paymentMethodEnabledSslcommerz,
  CARD: SITE_SETTING_KEYS.paymentMethodEnabledCard,
};

export function paymentMethodSettingKey(provider: PaymentProvider): string {
  return PROVIDER_SETTING_KEY[provider];
}

/**
 * Whether a provider is actually usable at checkout right now. Both halves
 * matter: the stored on/off switch an admin set, AND a fresh re-check that
 * the gateway is really live+configured — never just the stored switch
 * alone. That second check is what guarantees a method can't stay silently
 * "on" after its credentials are removed or its mode is flipped back to
 * sandbox, without anyone remembering to also flip this switch off. This is
 * the one function every surface (checkout page, the two server actions
 * that accept a payment method, the admin settings form) must call — never
 * read the stored flag directly.
 */
export function isPaymentMethodEnabled(provider: PaymentProvider, settings: Record<string, string>): boolean {
  return settings[paymentMethodSettingKey(provider)] === "1" && isGatewayLive(provider);
}

export function enabledPaymentMethods(settings: Record<string, string>): PaymentProvider[] {
  return PAYMENT_METHOD_PROVIDERS.filter((p) => isPaymentMethodEnabled(p, settings));
}
