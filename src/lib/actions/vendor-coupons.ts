"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { couponSchema } from "@/lib/validation/coupon";
import type { ActionState } from "./types";

async function requireVendor() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) redirect("/login?next=/vendor/coupons");
  return user.vendorProfile.id;
}

export async function createVendorCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireVendor();

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minOrderAmount: formData.get("minOrderAmount"),
    maxDiscountAmount: formData.get("maxDiscountAmount"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    usageLimit: formData.get("usageLimit"),
    perCustomerLimit: formData.get("perCustomerLimit"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const existing = await db.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { status: "error", message: "This coupon code is already in use." };

  await db.coupon.create({
    data: {
      vendorId,
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      minOrderAmount: parsed.data.minOrderAmount,
      maxDiscountAmount: parsed.data.maxDiscountAmount,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      usageLimit: parsed.data.usageLimit,
      perCustomerLimit: parsed.data.perCustomerLimit,
    },
  });

  revalidatePath("/vendor/coupons");
  return { status: "success", message: "Coupon created." };
}

export async function toggleVendorCouponAction(formData: FormData): Promise<void> {
  const vendorId = await requireVendor();
  const couponId = String(formData.get("couponId") ?? "");
  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (coupon && coupon.vendorId === vendorId) {
    await db.coupon.update({ where: { id: couponId }, data: { isActive: !coupon.isActive } });
  }
  revalidatePath("/vendor/coupons");
}
