import "server-only";
import { serverEnv } from "@/lib/env/server";
import type { PaymentAdapter, CreatePaymentInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";
import type { PaymentProvider } from "@/generated/prisma/client";

/**
 * SSLCommerz REST integration (Session + Validation API). Also backs the
 * "CARD" provider — SSLCommerz's hosted gateway page itself offers card
 * entry, so no separate integration is needed for debit/credit cards.
 * Shape follows SSLCommerz's public API docs but has not been exercised
 * against a live sandbox merchant account in this build — verify
 * request/response fields against https://developer.sslcommerz.com before
 * going live.
 */
export class SslcommerzAdapter implements PaymentAdapter {
  readonly isSandbox = serverEnv.SSLCOMMERZ_MODE === "sandbox";

  constructor(readonly provider: PaymentProvider = "SSLCOMMERZ") {}

  private get baseUrl() {
    return this.isSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    const storeId = serverEnv.SSLCOMMERZ_STORE_ID;
    const storePassword = serverEnv.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) {
      throw new Error("SSLCommerz credentials are not configured");
    }

    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: input.amount.toFixed(2),
      currency: "BDT",
      tran_id: input.paymentId,
      success_url: input.returnUrl,
      fail_url: input.returnUrl,
      cancel_url: input.returnUrl,
      ipn_url: `${serverEnv.APP_URL}/api/payments/webhook/SSLCOMMERZ`,
      cus_name: input.customerName,
      cus_email: input.customerEmail || "customer@pickup.example",
      cus_phone: input.customerPhone,
      cus_add1: "Khagrachari Sadar",
      cus_city: "Khagrachari",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: "Pick Up order",
      product_category: "Marketplace",
      product_profile: "general",
    });

    const res = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data: { status?: string; GatewayPageURL?: string; sessionkey?: string } = await res.json();

    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new Error("Failed to create SSLCommerz session");
    }

    return { redirectUrl: data.GatewayPageURL, providerRef: data.sessionkey ?? input.paymentId };
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerificationResult> {
    const storeId = serverEnv.SSLCOMMERZ_STORE_ID;
    const storePassword = serverEnv.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) throw new Error("SSLCommerz credentials are not configured");

    const params = new URLSearchParams({ val_id: providerRef, store_id: storeId, store_passwd: storePassword, format: "json" });
    const res = await fetch(`${this.baseUrl}/validator/api/validationserverAPI.php?${params.toString()}`);
    const data: { status?: string; amount?: string } = await res.json();

    const status = data.status === "VALID" || data.status === "VALIDATED" ? "PAID" : "FAILED";
    return { status, providerRef, amount: data.amount ? Number(data.amount) : undefined, rawPayload: data };
  }
}
