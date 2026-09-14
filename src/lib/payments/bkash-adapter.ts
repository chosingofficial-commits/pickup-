import "server-only";
import { serverEnv } from "@/lib/env/server";
import type { PaymentAdapter, CreatePaymentInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";

/**
 * bKash Tokenized Checkout (grant token -> create -> execute). Shape
 * follows bKash's published sandbox docs but has not been exercised
 * against a live sandbox merchant account in this build — verify against
 * https://developer.bka.sh before going live, and re-request a token when
 * it expires (bKash tokens are short-lived).
 */
export class BkashAdapter implements PaymentAdapter {
  readonly provider = "BKASH" as const;
  readonly isSandbox = serverEnv.BKASH_MODE === "sandbox";

  private get baseUrl() {
    return this.isSandbox ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" : "https://tokenized.pay.bka.sh/v1.2.0-beta";
  }

  private async grantToken(): Promise<string> {
    const { BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD } = serverEnv;
    if (!BKASH_APP_KEY || !BKASH_APP_SECRET || !BKASH_USERNAME || !BKASH_PASSWORD) {
      throw new Error("bKash credentials are not configured");
    }

    const res = await fetch(`${this.baseUrl}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: BKASH_USERNAME,
        password: BKASH_PASSWORD,
      },
      body: JSON.stringify({ app_key: BKASH_APP_KEY, app_secret: BKASH_APP_SECRET }),
    });
    const data: { id_token?: string } = await res.json();
    if (!data.id_token) throw new Error("Failed to obtain bKash token");
    return data.id_token;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    const token = await this.grantToken();
    const res = await fetch(`${this.baseUrl}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-App-Key": serverEnv.BKASH_APP_KEY!,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: input.customerPhone,
        callbackURL: input.returnUrl,
        amount: input.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: input.paymentId,
      }),
    });
    const data: { paymentID?: string; bkashURL?: string } = await res.json();
    if (!data.paymentID || !data.bkashURL) throw new Error("Failed to create bKash payment");
    return { redirectUrl: data.bkashURL, providerRef: data.paymentID };
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerificationResult> {
    const token = await this.grantToken();
    const res = await fetch(`${this.baseUrl}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-App-Key": serverEnv.BKASH_APP_KEY!,
      },
      body: JSON.stringify({ paymentID: providerRef }),
    });
    const data: { transactionStatus?: string; amount?: string } = await res.json();
    const status = data.transactionStatus === "Completed" ? "PAID" : "FAILED";
    return { status, providerRef, amount: data.amount ? Number(data.amount) : undefined, rawPayload: data };
  }
}
