import "server-only";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

/** A cancelled or failed order never actually delivered the discount, so its redemption releases the coupon back for reuse — delivered (and still in-progress) orders keep counting. */
export const STATUSES_THAT_DONT_COUNT_TOWARD_COUPON_USAGE: OrderStatus[] = ["CANCELLED", "FAILED_DELIVERY"];

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

/**
 * The real, race-safe usage check — `validateCoupon` above runs before the
 * checkout transaction starts and is only a best-effort preview; two
 * concurrent checkouts can both pass it and both reach here. This must run
 * inside the same `db.$transaction` as the order write it's gating, so the
 * row lock actually serializes concurrent redemptions of the same coupon:
 * the second caller can't even read the usage count until the first's
 * transaction has committed (or rolled back) and released the lock.
 */
export async function reserveCouponUsage(tx: Prisma.TransactionClient, couponId: string, customerId: string): Promise<boolean> {
  await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${couponId} FOR UPDATE`;
  const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: couponId } });

  if (coupon.usageLimit != null) {
    const used = await tx.couponRedemption.count({
      where: { couponId, order: { status: { notIn: STATUSES_THAT_DONT_COUNT_TOWARD_COUPON_USAGE } } },
    });
    if (used >= coupon.usageLimit) return false;
  }

  const usedByCustomer = await tx.couponRedemption.count({
    where: { couponId, order: { customerId, status: { notIn: STATUSES_THAT_DONT_COUNT_TOWARD_COUPON_USAGE } } },
  });
  if (usedByCustomer >= coupon.perCustomerLimit) return false;

  return true;
}
