import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { ScheduleForm } from "@/components/checkout/schedule-form";
import { getCheckoutState } from "@/lib/checkout/cookie";
import { getCurrentUser } from "@/lib/auth/session";
import { cartRequiresAdvanceScheduling } from "@/lib/cart/queries";

export const metadata: Metadata = { title: "Checkout — Delivery schedule" };

export default async function CheckoutSchedulePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const state = await getCheckoutState();
  if (!state.addressId) redirect("/checkout");

  const [requiresAdvanceScheduling, { error }] = await Promise.all([cartRequiresAdvanceScheduling(user.id), searchParams]);

  return (
    <Container className="py-8">
      <CheckoutSteps current="schedule" />
      <div className="mx-auto max-w-lg">
        <h1 className="font-heading text-xl font-bold text-brand-dark">Delivery schedule</h1>
        <p className="mt-1 text-sm text-gray-600">
          {requiresAdvanceScheduling
            ? "Your cart includes a weekly grocery pick, so this order needs to be scheduled at least 24 hours ahead."
            : "Choose when you'd like your order delivered."}
        </p>
        {error === "advance_required" && (
          <p role="alert" className="mt-3 rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Pick a delivery time at least 24 hours from now for this order.
          </p>
        )}
        <div className="mt-5 rounded-card border border-border-brand bg-white p-5">
          <ScheduleForm requiresAdvanceScheduling={requiresAdvanceScheduling} />
        </div>
      </div>
    </Container>
  );
}
