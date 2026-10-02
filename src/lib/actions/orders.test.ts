// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";

/**
 * Regression test for the race fixed in advanceOrderStatusAction's
 * RIDER_ASSIGNED handling: two riders could previously both pass a
 * pre-transaction "is this already assigned?" check and then both commit an
 * unconditional delivery.update, with the second silently overwriting the
 * first rider's assignment. The fix replaced that with a guarded
 * `updateMany({ where: { orderId, riderId: null }, ... })`, whose result
 * count tells the loser it lost — exercised here directly (not through the
 * action, which needs a request-scoped auth session) against a real
 * throwaway order, since this is exactly the Postgres-level guarantee the
 * whole "only one rider can ever accept" requirement rests on.
 */
describe("delivery rider-claim race guard", () => {
  let orderGroupId: string | undefined;

  afterEach(async () => {
    if (!orderGroupId) return;
    // Cascades: OrderGroup -> Order -> Delivery.
    await db.orderGroup.delete({ where: { id: orderGroupId } }).catch(() => {});
    orderGroupId = undefined;
  });

  it("lets exactly one of two concurrent claims succeed, never both", async () => {
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    const riders = await db.riderProfile.findMany({ where: { isApproved: true }, take: 2 });
    expect(riders.length).toBeGreaterThanOrEqual(2); // needs 2 seeded approved riders to exercise a real race

    const suffix = `RACE-TEST-${Date.now()}`;
    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId: customer.id, subtotal: 100, deliveryFeeTotal: 20, grandTotal: 120 },
    });
    orderGroupId = orderGroup.id;
    const order = await db.order.create({
      data: {
        orderNumber: suffix,
        orderGroupId: orderGroup.id,
        customerId: customer.id,
        vendorId: vendor.id,
        addressId: address.id,
        deliveryZoneId: zone.id,
        status: "PREPARING",
        subtotal: 100,
        deliveryFee: 20,
        total: 120,
        commissionRatePct: 10,
        commissionAmount: 10,
        vendorEarnings: 90,
      },
    });
    await db.delivery.create({ data: { orderId: order.id, riderSearchStartedAt: new Date() } });

    const claim = (riderId: string) => db.delivery.updateMany({ where: { orderId: order.id, riderId: null }, data: { riderId, assignedAt: new Date(), isTrackingActive: true } });

    const [resultA, resultB] = await Promise.all([claim(riders[0]!.id), claim(riders[1]!.id)]);
    const successes = [resultA.count, resultB.count].filter((c) => c === 1).length;
    expect(successes).toBe(1);

    const delivery = await db.delivery.findUniqueOrThrow({ where: { orderId: order.id } });
    expect([riders[0]!.id, riders[1]!.id]).toContain(delivery.riderId);
  });
});
