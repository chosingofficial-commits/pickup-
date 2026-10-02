import "server-only";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/client";

/** A cancelled or failed order never actually delivered the discount, so its redemption releases the coupon back for reuse — delivered (and still in-progress) orders keep counting. */
const STATUSES_THAT_DONT_COUNT_TOWARD_COUPON_USAGE: OrderStatus[] = ["CANCELLED", "FAILED_DELIVERY"];

export type ValidatedCoupon = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
};

export async function validateCoupon(
  code: string,
  userId: string | undefined,
  subtotal: number,
): Promise<{ ok: true; coupon: ValidatedCoupon } | { ok: false; message: string }> {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.isActive) return { ok: false, message: "This coupon code is not valid." };

  const now = new Date();
  if (now < coupon.startsAt || now > coupon.endsAt) return { ok: false, message: "This coupon has expired." };

  if (coupon.usageLimit != null) {
    const used = await db.couponRedemption.count({
      where: { couponId: coupon.id, order: { status: { notIn: STATUSES_THAT_DONT_COUNT_TOWARD_COUPON_USAGE } } },
    });
    if (used >= coupon.usageLimit) return { ok: false, message: "This coupon has reached its usage limit." };
  }

  if (userId) {
    const usedByCustomer = await db.couponRedemption.count({
      where: { couponId: coupon.id, order: { customerId: userId, status: { notIn: STATUSES_THAT_DONT_COUNT_TOWARD_COUPON_USAGE } } },
    });
    if (usedByCustomer >= coupon.perCustomerLimit) {
      return { ok: false, message: "You've already used this coupon the maximum number of times." };
    }
  }

  if (subtotal < Number(coupon.minOrderAmount)) {
    return { ok: false, message: `Add ${formatBDT(Number(coupon.minOrderAmount) - subtotal)} more to use this coupon.` };
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      minOrderAmount: Number(coupon.minOrderAmount),
      maxDiscountAmount: coupon.maxDiscountAmount != null ? Number(coupon.maxDiscountAmount) : null,
    },
  };
}
