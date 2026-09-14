import "server-only";
import type { PaymentAdapter, CreatePaymentInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";

/** Cash on delivery never touches a gateway — it's confirmed at checkout and settled when the rider collects payment. */
export class CodAdapter implements PaymentAdapter {
  readonly provider = "COD" as const;
  readonly isSandbox = false;

  async createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    return { redirectUrl: input.returnUrl, providerRef: `cod_${input.paymentId}` };
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerificationResult> {
    return { status: "PENDING", providerRef };
  }
}
