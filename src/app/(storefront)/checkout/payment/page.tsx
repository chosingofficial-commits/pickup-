import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { selectPaymentMethodAction } from "@/lib/actions/checkout";
import { getCheckoutState } from "@/lib/checkout/cookie";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/settings";
import { enabledPaymentMethods } from "@/lib/payments/method-settings";
import type { PaymentProvider } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Checkout — Payment method" };

const METHOD_INFO: Record<PaymentProvider, { label: string; description: string }> = {
  COD: { label: "Cash on delivery", description: "Pay the rider when your order arrives." },
  BKASH: { label: "bKash", description: "Pay with your bKash account." },
  NAGAD: { label: "Nagad", description: "Pay with your Nagad account." },
  ROCKET: { label: "Rocket", description: "Pay with your Rocket account." },
  SSLCOMMERZ: { label: "SSLCommerz", description: "Pay via SSLCommerz." },
  CARD: { label: "Debit / Credit card", description: "Visa, Mastercard, or other supported cards." },
};

export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const state = await getCheckoutState();
  if (!state.addressId) redirect("/checkout");

  const { error } = await searchParams;
  const settings = await getSiteSettings();
  const available = enabledPaymentMethods(settings);
  const defaultMethod = available.includes("COD") ? "COD" : available[0];

  return (
    <Container className="py-8">
      <CheckoutSteps current="payment" />
      <div className="mx-auto max-w-lg">
        <h1 className="font-heading text-xl font-bold text-brand-dark">Payment method</h1>
        <p className="mt-1 text-sm text-gray-600">Choose how you&apos;d like to pay.</p>

        {error === "agreement" && (
          <p role="alert" className="mt-3 rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Please accept the terms to continue.
          </p>
        )}
        {error === "method_unavailable" && (
          <p role="alert" className="mt-3 rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            That payment method isn&apos;t available right now. Please choose another.
          </p>
        )}

        {available.length === 0 ? (
          <p role="alert" className="mt-5 rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            No payment methods are available right now. Please contact support.
          </p>
        ) : (
          <form action={selectPaymentMethodAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              {available.map((value) => {
                const method = METHOD_INFO[value];
                return (
                  <label
                    key={value}
                    className="flex items-center gap-3 rounded-control border border-border-brand p-3 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-bg"
                  >
                    <input type="radio" name="paymentMethod" value={value} defaultChecked={value === defaultMethod} required />
                    <span className="flex-1">
                      <span className="text-sm font-semibold text-brand-dark">{method.label}</span>
                      <span className="block text-xs text-gray-500">{method.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input type="checkbox" name="agreementAccepted" value="1" required className="mt-0.5" />
              I agree to Pick Up&apos;s Terms of Service and Privacy Policy, and confirm the order details are correct.
            </label>

            <button
              type="submit"
              className="w-full rounded-control bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              Continue to review
            </button>
          </form>
        )}
      </div>
    </Container>
  );
}
