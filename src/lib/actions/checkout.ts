"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { updateCheckoutState, getCheckoutState } from "@/lib/checkout/cookie";
import { cartRequiresAdvanceScheduling } from "@/lib/cart/queries";

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

  await updateCheckoutState({ paymentMethod });
  redirect("/checkout/review");
}

export async function requireCheckoutReady(): Promise<{ addressId: string; scheduledFor: string | null; paymentMethod: string }> {
  const state = await getCheckoutState();
  if (!state.addressId) redirect("/checkout");
  if (!state.paymentMethod) redirect("/checkout/payment");
  return { addressId: state.addressId, scheduledFor: state.scheduledFor ?? null, paymentMethod: state.paymentMethod };
}
