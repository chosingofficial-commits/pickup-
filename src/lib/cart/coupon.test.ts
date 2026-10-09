// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { validateCoupon } from "./coupon";
import { computeCouponDiscount } from "./totals";

/**
 * Integration tests against the seeded demo database (see prisma/seed.ts),
 * which ships WELCOME50 (FIXED Tk 50, min Tk 300) and SAVE10 (PERCENTAGE 10%,
 * max Tk 100, min Tk 500) as platform-wide coupons, and a demo customer.
 *
 * These two coupons are real, admin-editable rows — prisma/seed.ts
 * deliberately upserts them with `update: {}` (same convention as most other
 * demo data) so a reseed never stomps whatever an admin has changed since.
 * That means anyone exploring the admin coupon-management UI (e.g. toggling
 * "active" off to see what the storefront does) permanently leaves these
 * coupons in that state for every future test run — which is exactly what
 * had happened here: both were flipped to isActive=false during unrelated
 * manual QA, well before this test file ever ran, and `validateCoupon` was
 * correctly rejecting them the whole time. Not a logic bug. The fix is to
 * stop trusting ambient seeded state and instead make this suite restore
 * both coupons to their documented canonical values up front, the same way
 * the "cancelled/failed orders" describe block below already controls its
 * own throwaway coupon state instead of relying on what's already there.
 */
describe("validateCoupon", () => {
  let customerId: string;

  beforeAll(async () => {
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    customerId = customer.id;

    const canonical = {
      isActive: true,
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000 * 365),
      usageLimit: null,
    };
    await db.coupon.update({
      where: { code: "WELCOME50" },
      data: { ...canonical, type: "FIXED", value: 50, minOrderAmount: 300, maxDiscountAmount: null, perCustomerLimit: 1 },
    });
    await db.coupon.update({
      where: { code: "SAVE10" },
      data: { ...canonical, type: "PERCENTAGE", value: 10, minOrderAmount: 500, maxDiscountAmount: 100, perCustomerLimit: 3 },
    });

    // Same reasoning for perCustomerLimit: clear any redemptions this demo
    // customer has racked up against these two coupons from unrelated manual
    // QA, so "accepts a coupon" tests never start pre-exhausted either.
    await db.couponRedemption.deleteMany({
      where: { coupon: { code: { in: ["WELCOME50", "SAVE10"] } }, order: { customerId } },
    });
  });

  it("rejects an unknown coupon code", async () => {
    const result = await validateCoupon("NOT-A-REAL-CODE", customerId, 1000);
    expect(result.ok).toBe(false);
  });

  it("rejects a coupon when the subtotal is below its minimum order amount", async () => {
    const result = await validateCoupon("WELCOME50", customerId, 100);
    expect(result.ok).toBe(false);
  });

  it("accepts a fixed-value coupon once the minimum is met", async () => {
    const result = await validateCoupon("WELCOME50", customerId, 500);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coupon.type).toBe("FIXED");
      expect(computeCouponDiscount(500, result.coupon)).toBe(50);
    }
  });

  it("accepts a percentage coupon and caps the discount at maxDiscountAmount", async () => {
    const result = await validateCoupon("SAVE10", customerId, 2000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coupon.type).toBe("PERCENTAGE");
      // 10% of 2000 is 200, but the coupon caps at Tk 100.
      expect(computeCouponDiscount(2000, result.coupon)).toBe(100);
    }
  });

  it("is case-insensitive on the coupon code", async () => {
    const result = await validateCoupon("welcome50", customerId, 500);
    expect(result.ok).toBe(true);
  });
});

/**
 * Regression tests for the coupon-release fix: a CANCELLED/FAILED_DELIVERY
 * order's redemption must not count toward usageLimit/perCustomerLimit (the
 * customer never actually got the discount fulfilled), while a DELIVERED
 * (or any still-in-progress) order's redemption must keep counting. Uses a
 * throwaway coupon + order so this is never affected by how many times the
 * real seeded WELCOME50/SAVE10 coupons have been used by other test runs.
 */
describe("validateCoupon — cancelled/failed orders release their coupon use", () => {
  let customerId: string;
  let vendorId: string;
  let addressId: string;
  let deliveryZoneId: string;
  const orderGroupIds: string[] = [];

  beforeAll(async () => {
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    customerId = customer.id;
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    vendorId = vendor.id;
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    addressId = address.id;
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    deliveryZoneId = zone.id;
  });

  afterAll(async () => {
    for (const id of orderGroupIds) {
      const orders = await db.order.findMany({ where: { orderGroupId: id }, select: { id: true } });
      await db.couponRedemption.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } });
      await db.orderGroup.delete({ where: { id } }).catch(() => {});
    }
  });

  async function makeOrderWithRedemption(couponId: string, status: "CANCELLED" | "FAILED_DELIVERY" | "DELIVERED") {
    const suffix = `COUPONTEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId, subtotal: 1000, deliveryFeeTotal: 20, grandTotal: 970 },
    });
    orderGroupIds.push(orderGroup.id);
    const order = await db.order.create({
      data: {
        orderNumber: suffix,
        orderGroupId: orderGroup.id,
        customerId,
        vendorId,
        addressId,
        deliveryZoneId,
        status,
        subtotal: 1000,
        deliveryFee: 20,
        discount: 50,
        total: 970,
        commissionRatePct: 10,
        commissionAmount: 100,
        vendorEarnings: 900,
      },
    });
    await db.couponRedemption.create({ data: { couponId, orderId: order.id, discountApplied: 50 } });
  }

  it("a CANCELLED order's redemption does not count toward perCustomerLimit — the coupon stays usable", async () => {
    const coupon = await db.coupon.create({
      data: { code: `TESTCANCEL${Date.now()}`, type: "FIXED", value: 50, minOrderAmount: 0, perCustomerLimit: 1, isActive: true, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000) },
    });
    try {
      await makeOrderWithRedemption(coupon.id, "CANCELLED");
      const result = await validateCoupon(coupon.code, customerId, 1000);
      expect(result.ok).toBe(true);
    } finally {
      await db.coupon.delete({ where: { id: coupon.id } });
    }
  });

  it("a FAILED_DELIVERY order's redemption does not count toward perCustomerLimit either", async () => {
    const coupon = await db.coupon.create({
      data: { code: `TESTFAILED${Date.now()}`, type: "FIXED", value: 50, minOrderAmount: 0, perCustomerLimit: 1, isActive: true, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000) },
    });
    try {
      await makeOrderWithRedemption(coupon.id, "FAILED_DELIVERY");
      const result = await validateCoupon(coupon.code, customerId, 1000);
      expect(result.ok).toBe(true);
    } finally {
      await db.coupon.delete({ where: { id: coupon.id } });
    }
  });

  it("a DELIVERED order's redemption still counts toward perCustomerLimit", async () => {
    const coupon = await db.coupon.create({
      data: { code: `TESTDELIVERED${Date.now()}`, type: "FIXED", value: 50, minOrderAmount: 0, perCustomerLimit: 1, isActive: true, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000) },
    });
    try {
      await makeOrderWithRedemption(coupon.id, "DELIVERED");
      const result = await validateCoupon(coupon.code, customerId, 1000);
      expect(result.ok).toBe(false);
    } finally {
      await db.coupon.delete({ where: { id: coupon.id } });
    }
  });
});
