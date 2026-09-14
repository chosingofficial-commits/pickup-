"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullCart } from "@/lib/cart/queries";
import { groupSubtotal } from "@/lib/cart/totals";
import { validateCoupon } from "@/lib/cart/coupon";
import { setSelectedCouponCode } from "@/lib/cart/coupon-cookie";
import type { ActionState } from "./types";

export async function applyCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { status: "error", message: "Enter a coupon code." };

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Log in to use a coupon." };

  const { lines } = await getFullCart(user.id);
  const subtotal = groupSubtotal(lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, addOnsTotal: l.addOnsTotal })));

  const result = await validateCoupon(code, user.id, subtotal);
  if (!result.ok) return { status: "error", message: result.message };

  await setSelectedCouponCode(result.coupon.code);
  revalidatePath("/cart");
  return { status: "success", message: `Coupon "${result.coupon.code}" applied.` };
}

export async function removeCouponAction(): Promise<void> {
  await setSelectedCouponCode(null);
  revalidatePath("/cart");
}
