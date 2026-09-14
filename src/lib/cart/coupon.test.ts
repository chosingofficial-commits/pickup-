// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { validateCoupon } from "./coupon";
import { computeCouponDiscount } from "./totals";

/**
 * Integration tests against the seeded demo database (see prisma/seed.ts),
 * which ships WELCOME50 (FIXED ৳50, min ৳300) and SAVE10 (PERCENTAGE 10%,
 * max ৳100, min ৳500) as platform-wide coupons, and a demo customer.
 */
describe("validateCoupon", () => {
  let customerId: string;

  beforeAll(async () => {
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    customerId = customer.id;
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
      // 10% of 2000 is 200, but the coupon caps at ৳100.
      expect(computeCouponDiscount(2000, result.coupon)).toBe(100);
    }
  });

  it("is case-insensitive on the coupon code", async () => {
    const result = await validateCoupon("welcome50", customerId, 500);
    expect(result.ok).toBe(true);
  });
});
