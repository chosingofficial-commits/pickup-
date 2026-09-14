import "server-only";
import { serverEnv } from "@/lib/env/server";
import type { PaymentAdapter, CreatePaymentInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";

/**
 * Dutch-Bangla Bank's Rocket does not publish a self-serve merchant REST
 * API — integration is arranged directly with DBBL (or via an approved
 * payment aggregator) under a merchant agreement, and the request/response
 * shape depends on what they issue you. This adapter is a placeholder so
 * the app's provider list and UI are ready; fill in the real calls once
 * DBBL provides merchant API docs and sandbox credentials.
 */
export class RocketAdapter implements PaymentAdapter {
  readonly provider = "ROCKET" as const;
  readonly isSandbox = serverEnv.ROCKET_MODE === "sandbox";

  async createPayment(_input: CreatePaymentInput): Promise<PaymentInitiationResult> {
    throw new Error(
      "Rocket live integration is not implemented — this adapter is a placeholder. " +
        "DBBL does not publish a public self-serve API; request merchant API docs and sandbox " +
        "credentials from DBBL, implement the calls here, then set ROCKET_MODE=live. " +
        "Until then, leave ROCKET_MODE=sandbox so orders use the mock adapter.",
    );
  }

  async verifyPayment(providerRef: string): Promise<PaymentVerificationResult> {
    return { status: "PENDING", providerRef };
  }
}
