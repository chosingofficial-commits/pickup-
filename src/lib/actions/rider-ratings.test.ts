// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createDeliveryEarningEntry } from "./orders";

/**
 * submitRiderRatingAction itself needs a request-scoped session
 * (getCurrentUser reads cookies()), so — same workaround as
 * orders.test.ts/refunds.test.ts use for the same reason — these tests
 * exercise the underlying invariants the action relies on directly against
 * the real database: the DB-level uniqueness that makes "only once per
 * delivery" hold even under a race, and the rating-aggregate recompute the
 * action performs in its transaction.
 */
describe("rider ratings", () => {
  let orderGroupId: string | undefined;
  let riderUserId: string | undefined;
  let riderProfileId: string | undefined;

  afterEach(async () => {
    if (orderGroupId) {
      const orders = await db.order.findMany({ where: { orderGroupId }, select: { id: true } });
      await db.riderRating.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } });
      await db.orderGroup.delete({ where: { id: orderGroupId } }).catch(() => {});
    }
    if (riderProfileId) await db.riderLedgerEntry.deleteMany({ where: { riderId: riderProfileId } }).catch(() => {});
    if (riderUserId) await db.user.delete({ where: { id: riderUserId } }).catch(() => {});
    orderGroupId = undefined;
    riderUserId = undefined;
    riderProfileId = undefined;
  });

  async function createDeliveredOrder() {
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });

    const riderUser = await db.user.create({
      data: { role: "RIDER", name: "Rating Test Rider", phone: `+882${Date.now()}`, passwordHash: "test" },
    });
    riderUserId = riderUser.id;
    const rider = await db.riderProfile.create({ data: { userId: riderUser.id, isApproved: true } });
    riderProfileId = rider.id;

    const suffix = `RATING-TEST-${Date.now()}`;
    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId: customer.id, subtotal: 100, deliveryFeeTotal: 20, grandTotal: 120 },
    });
    orderGroupId = orderGroup.id;
    await db.payment.create({ data: { orderGroupId: orderGroup.id, provider: "COD", amount: 120, isSandbox: true } });

    const order = await db.order.create({
      data: {
        orderNumber: suffix,
        orderGroupId: orderGroup.id,
        customerId: customer.id,
        vendorId: vendor.id,
        addressId: address.id,
        deliveryZoneId: zone.id,
        status: "DELIVERED",
        subtotal: 100,
        deliveryFee: 20,
        total: 120,
        commissionRatePct: 10,
        commissionAmount: 10,
        vendorEarnings: 90,
        standardDeliveryFeePoisha: 2000,
      },
    });
    const delivery = await db.delivery.create({ data: { orderId: order.id, riderId: rider.id, deliveredAt: new Date() } });
    await db.$transaction(async (tx) => {
      await createDeliveryEarningEntry(tx, { ...order, orderGroup: { payment: { provider: "COD" } } }, delivery.id, rider.id);
    });

    return { order, customer, rider };
  }

  it("creating a rating recomputes the rider's cached ratingAvg/ratingCount", async () => {
    const { order, customer, rider } = await createDeliveredOrder();

    await db.riderRating.create({ data: { orderId: order.id, customerId: customer.id, riderId: rider.id, rating: 4, comment: "Good" } });
    const agg = await db.riderRating.aggregate({ where: { riderId: rider.id }, _avg: { rating: true }, _count: true });
    await db.riderProfile.update({ where: { id: rider.id }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });

    const updated = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { ratingAvg: true, ratingCount: true } });
    expect(Number(updated.ratingAvg)).toBe(4);
    expect(updated.ratingCount).toBe(1);
  });

  it("only one rating can ever exist per order (DB-level unique constraint), even racing two inserts", async () => {
    const { order, customer, rider } = await createDeliveredOrder();

    const results = await Promise.allSettled([
      db.riderRating.create({ data: { orderId: order.id, customerId: customer.id, riderId: rider.id, rating: 5 } }),
      db.riderRating.create({ data: { orderId: order.id, customerId: customer.id, riderId: rider.id, rating: 1 } }),
    ]);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    expect(succeeded).toBe(1);

    const count = await db.riderRating.count({ where: { orderId: order.id } });
    expect(count).toBe(1);
  });

  it("a rating is linked to exactly one order, customer, and rider", async () => {
    const { order, customer, rider } = await createDeliveredOrder();
    const rating = await db.riderRating.create({ data: { orderId: order.id, customerId: customer.id, riderId: rider.id, rating: 3 } });
    expect(rating.orderId).toBe(order.id);
    expect(rating.customerId).toBe(customer.id);
    expect(rating.riderId).toBe(rider.id);
  });
});
