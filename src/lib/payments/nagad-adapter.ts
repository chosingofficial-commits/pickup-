import "server-only";
import { serverEnv } from "@/lib/env/server";
import type { PaymentAdapter, CreatePaymentInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";

/**
 * Nagad's merchant checkout API requires RSA-signed request payloads
 * (merchant private key + Nagad's public key) on top of the basic
 * initialize/verify calls sketched below. That signing step needs a real
 * sandbox merchant account to implement and test correctly, so it is left
 * as a documented extension point rather than guessed at here — see
 * https://developer.mynagad.com before enabling NAGAD_MODE=live.
 */
export class NagadAdapter implements PaymentAdapter {
  readonly provider = "NAGAD" as const;
  readonly isSandbox = serverEnv.NAGAD_MODE === "sandbox";

  async createPayment(_input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    throw new Error(
      "Nagad live integration is not implemented — this adapter is a placeholder. " +
        "Configure NAGAD_MERCHANT_ID/NAGAD_MERCHANT_PRIVATE_KEY/NAGAD_PG_PUBLIC_KEY and implement " +
        "the RSA-signed initialize/checkout calls per Nagad's merchant API docs, then wire them in here. " +
        "Until then, leave NAGAD_MODE=sandbox so orders use the mock adapter.",
    );
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerificationResult> {
    return { status: "PENDING", providerRef };
  }
}
