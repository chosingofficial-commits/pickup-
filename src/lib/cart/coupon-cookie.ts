import "server-only";
import { cookies } from "next/headers";

const COUPON_COOKIE_NAME = "pickup_coupon";

export async function getSelectedCouponCode(): Promise<string | null> {
  const store = await cookies();
  return store.get(COUPON_COOKIE_NAME)?.value ?? null;
}

export async function setSelectedCouponCode(code: string | null) {
  const store = await cookies();
  if (code) {
    store.set(COUPON_COOKIE_NAME, code, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
  } else {
    store.delete(COUPON_COOKIE_NAME);
  }
}
