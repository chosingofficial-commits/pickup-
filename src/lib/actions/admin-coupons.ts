"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { couponSchema } from "@/lib/validation/coupon";
import type { ActionState } from "./types";

export async function createPlatformCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

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
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = await db.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { status: "error", message: "This coupon code is already in use." };

  await db.coupon.create({
    data: {
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

  await recordAuditLog({ actorUserId: admin.id, action: "PLATFORM_COUPON_CREATED", entityType: "Coupon", metadata: { code: parsed.data.code } });
  revalidatePath("/admin/coupons");
  return { status: "success", message: "Coupon created." };
}

export async function toggleCouponActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const couponId = String(formData.get("couponId") ?? "");
  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return;
  await db.coupon.update({ where: { id: couponId }, data: { isActive: !coupon.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: coupon.isActive ? "COUPON_DISABLED" : "COUPON_ENABLED", entityType: "Coupon", entityId: couponId });
  revalidatePath("/admin/coupons");
}
