// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { reserveCouponUsage } from "./coupon";

/**
 * Regression coverage for DB-2: validateCoupon's usage/per-customer-limit
 * check ran once, before placeOrderAction's transaction started, with no
 * re-check and no row lock inside it — so two concurrent checkouts racing
 * for a coupon's last use (or the same customer's last allowed use) could
 * both pass validation and both redeem it. reserveCouponUsage now runs
 * inside the order-placement transaction, locks the coupon row first, and
 * only one concurrent caller can ever see "still available."
 */
describe("reserveCouponUsage", () => {
  let couponId: string | undefined;
  const orderGroupIds: string[] = [];

  afterEach(async () => {
    // Deleting the coupon cascades away its CouponRedemption rows first, so
    // the orders they reference can then be deleted without an FK conflict.
    if (couponId) await db.coupon.delete({ where: { id: couponId } }).catch(() => {});
    for (const id of orderGroupIds.splice(0)) await db.orderGroup.delete({ where: { id } }).catch(() => {});
    couponId = undefined;
  });

  async function makeCoupon(opts: { usageLimit: number | null; perCustomerLimit: number }) {
    const suffix = `RACE${Date.now()}`;
    const coupon = await db.coupon.create({
      data: {
        code: suffix,
        type: "FIXED",
        value: 10,
        usageLimit: opts.usageLimit,
        perCustomerLimit: opts.perCustomerLimit,
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 86_400_000),
      },
    });
    couponId = coupon.id;
    return coupon;
  }

  /** Mirrors what placeOrderAction does: reserve inside a transaction, then (only if reserved) create an order + redemption. */
  async function attemptCheckout(coupon: { id: string }, customerId: string, vendorId: string, addressId: string, zoneId: string): Promise<"reserved" | "rejected"> {
    return db.$transaction(async (tx) => {
      const reserved = await reserveCouponUsage(tx, coupon.id, customerId);
      if (!reserved) return "rejected";

      const suffix = `RACE-ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const orderGroup = await tx.orderGroup.create({ data: { groupNumber: suffix, customerId, subtotal: 100, deliveryFeeTotal: 0, grandTotal: 90 } });
      orderGroupIds.push(orderGroup.id);
      const order = await tx.order.create({
        data: {
          orderNumber: suffix,
          orderGroupId: orderGroup.id,
          customerId,
          vendorId,
          addressId,
          deliveryZoneId: zoneId,
          status: "ORDER_PLACED",
          subtotal: 100,
          deliveryFee: 0,
          discount: 10,
          total: 90,
          commissionRatePct: 10,
          commissionAmount: 10,
          vendorEarnings: 90,
        },
      });
      await tx.couponRedemption.create({ data: { couponId: coupon.id, orderId: order.id, discountApplied: 10 } });
      return "reserved";
    });
  }

  async function fixtures() {
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    return { vendor, customer, address, zone };
  }

  it("two concurrent checkouts with 1 use left on a coupon: exactly one succeeds", async () => {
    const { vendor, customer, address, zone } = await fixtures();
    const coupon = await makeCoupon({ usageLimit: 1, perCustomerLimit: 10 });

    const [a, b] = await Promise.all([
      attemptCheckout(coupon, customer.id, vendor.id, address.id, zone.id),
      attemptCheckout(coupon, customer.id, vendor.id, address.id, zone.id),
    ]);

    const results = [a, b];
    expect(results.filter((r) => r === "reserved")).toHaveLength(1);
    expect(results.filter((r) => r === "rejected")).toHaveLength(1);
  });

  it("two concurrent checkouts from the same customer with perCustomerLimit 1: exactly one succeeds", async () => {
    const { vendor, customer, address, zone } = await fixtures();
    const coupon = await makeCoupon({ usageLimit: null, perCustomerLimit: 1 });

    const [a, b] = await Promise.all([
      attemptCheckout(coupon, customer.id, vendor.id, address.id, zone.id),
      attemptCheckout(coupon, customer.id, vendor.id, address.id, zone.id),
    ]);

    const results = [a, b];
    expect(results.filter((r) => r === "reserved")).toHaveLength(1);
    expect(results.filter((r) => r === "rejected")).toHaveLength(1);
  });

  it("normal, non-concurrent coupon use still succeeds", async () => {
    const { vendor, customer, address, zone } = await fixtures();
    const coupon = await makeCoupon({ usageLimit: 5, perCustomerLimit: 5 });

    const result = await attemptCheckout(coupon, customer.id, vendor.id, address.id, zone.id);
    expect(result).toBe("reserved");
  });
});
