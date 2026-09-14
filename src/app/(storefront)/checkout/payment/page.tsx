import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { selectPaymentMethodAction } from "@/lib/actions/checkout";
import { getCheckoutState } from "@/lib/checkout/cookie";
import { getCurrentUser } from "@/lib/auth/session";
import { getPaymentAdapter } from "@/lib/payments/registry";
import type { PaymentProvider } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Checkout — Payment method" };

const METHODS: { value: PaymentProvider; label: string; description: string }[] = [
  { value: "COD", label: "Cash on delivery", description: "Pay the rider when your order arrives." },
  { value: "BKASH", label: "bKash", description: "Pay with your bKash account." },
  { value: "NAGAD", label: "Nagad", description: "Pay with your Nagad account." },
  { value: "ROCKET", label: "Rocket", description: "Pay with your Rocket account." },
  { value: "SSLCOMMERZ", label: "SSLCommerz", description: "Pay via SSLCommerz." },
  { value: "CARD", label: "Debit / Credit card", description: "Visa, Mastercard, or other supported cards." },
];

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

        <form action={selectPaymentMethodAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            {METHODS.map((method) => {
              const adapter = getPaymentAdapter(method.value);
              return (
                <label
                  key={method.value}
                  className="flex items-center gap-3 rounded-control border border-border-brand p-3 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-bg"
                >
                  <input type="radio" name="paymentMethod" value={method.value} defaultChecked={method.value === "COD"} required />
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-brand-dark">{method.label}</span>
                      {adapter.isSandbox && method.value !== "COD" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                          Sandbox
                        </span>
                      )}
                    </span>
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
      </div>
    </Container>
  );
}
