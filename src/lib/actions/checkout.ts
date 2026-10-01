"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { updateCheckoutState, getCheckoutState } from "@/lib/checkout/cookie";
import { cartRequiresAdvanceScheduling } from "@/lib/cart/queries";
import { getSiteSettingsUncached } from "@/lib/settings";
import { isPaymentMethodEnabled, PAYMENT_METHOD_PROVIDERS } from "@/lib/payments/method-settings";
import type { PaymentProvider } from "@/generated/prisma/client";

const WEEKLY_GROCERY_MIN_ADVANCE_MS = 24 * 60 * 60 * 1000;

export async function selectScheduleAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const mode = String(formData.get("mode") ?? "now");
  const scheduledFor = mode === "later" ? String(formData.get("scheduledFor") ?? "") : null;

  // Re-validated server-side regardless of what the form allowed — the UI hides
  // "as soon as possible" and sets a min datetime, but both are client-side only.
  if (await cartRequiresAdvanceScheduling(user.id)) {
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() + WEEKLY_GROCERY_MIN_ADVANCE_MS) {
      redirect("/checkout/schedule?error=advance_required");
    }
  }

  await updateCheckoutState({ scheduledFor: scheduledFor || null });
  redirect("/checkout/payment");
}

export async function selectPaymentMethodAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");
  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  const agreementAccepted = formData.get("agreementAccepted");
  if (!agreementAccepted) redirect("/checkout/payment?error=agreement");

  // Re-validated server-side regardless of what the payment page rendered —
  // never trust a client-supplied method value, even one that used to be a
  // valid radio option (an admin may have disabled it moments ago).
  const settings = await getSiteSettingsUncached();
  const isValidProvider = (PAYMENT_METHOD_PROVIDERS as string[]).includes(paymentMethod);
  if (!isValidProvider || !isPaymentMethodEnabled(paymentMethod as PaymentProvider, settings)) {
    redirect("/checkout/payment?error=method_unavailable");
  }

  await updateCheckoutState({ paymentMethod });
  redirect("/checkout/review");
}

export async function requireCheckoutReady(): Promise<{ addressId: string; scheduledFor: string | null; paymentMethod: string }> {
  const state = await getCheckoutState();
  if (!state.addressId) redirect("/checkout");
  if (!state.paymentMethod) redirect("/checkout/payment");
  return { addressId: state.addressId, scheduledFor: state.scheduledFor ?? null, paymentMethod: state.paymentMethod };
}
