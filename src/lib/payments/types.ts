import type { PaymentProvider } from "@/generated/prisma/client";

export type CreatePaymentInput = {
  paymentId: string;
  orderGroupId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  returnUrl: string;
};

export type PaymentInitiationResult = {
  /** Where to send the customer next — our own confirmation page for COD, the gateway's hosted page otherwise. */
  redirectUrl: string;
  providerRef: string;
};

export type PaymentVerificationResult = {
  status: "PAID" | "FAILED" | "PENDING";
  providerRef: string;
  amount?: number;
  rawPayload?: unknown;
};

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  readonly isSandbox: boolean;
  createPayment(input: CreatePaymentInput): Promise<PaymentInitiationResult>;
  /** Re-checks status directly with the provider — never trust a client-supplied redirect param alone. */
  verifyPayment(providerRef: string): Promise<PaymentVerificationResult>;
}
