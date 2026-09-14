import "server-only";
import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env/public";
import type { PaymentAdapter, CreatePaymentInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";
import type { PaymentProvider } from "@/generated/prisma/client";

/**
 * Stands in for a real gateway when merchant credentials aren't configured.
 * Sends the customer to an on-site page clearly labeled "Sandbox Payment"
 * where they simulate success/failure — it never claims to move real money.
 */
export class MockPaymentAdapter implements PaymentAdapter {
  readonly isSandbox = true;

  constructor(readonly provider: PaymentProvider) {}

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    const providerRef = `mock_${this.provider.toLowerCase()}_${input.paymentId}`;
    return {
      redirectUrl: `${publicEnv.appUrl}/checkout/pay/mock/${input.paymentId}?returnUrl=${encodeURIComponent(input.returnUrl)}`,
      providerRef,
    };
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerificationResult> {
    const payment = await db.payment.findFirst({ where: { providerRef } });
    if (!payment) return { status: "FAILED", providerRef };
    if (payment.status === "PAID") return { status: "PAID", providerRef, amount: Number(payment.amount) };
    if (payment.status === "FAILED" || payment.status === "CANCELLED") return { status: "FAILED", providerRef };
    return { status: "PENDING", providerRef };
  }
}
