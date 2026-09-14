import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

const CHECKOUT_COOKIE_NAME = "pickup_checkout";

export type CheckoutState = {
  addressId?: string;
  scheduledFor?: string | null;
  paymentMethod?: string;
};

export const getCheckoutState = cache(async (): Promise<CheckoutState> => {
  const store = await cookies();
  const raw = store.get(CHECKOUT_COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CheckoutState;
  } catch {
    return {};
  }
});

export async function updateCheckoutState(patch: Partial<CheckoutState>) {
  const current = await getCheckoutState();
  const next = { ...current, ...patch };
  const store = await cookies();
  store.set(CHECKOUT_COOKIE_NAME, JSON.stringify(next), { path: "/", maxAge: 60 * 60 * 2, sameSite: "lax" });
  return next;
}

export async function clearCheckoutState() {
  const store = await cookies();
  store.delete(CHECKOUT_COOKIE_NAME);
}
