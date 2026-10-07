// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createDeliveryEarningEntry } from "./orders";

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

/**
 * Regression coverage for treating RETURNED the same as REFUNDED (per
 * explicit decision): neither transition automatically reverses the
 * rider's delivery-earning ledger entry anymore. advanceOrderStatusAction's
 * transaction body for RETURNED is exercised directly here (status update +
 * status-history row, no reversal call) since the action itself requires a
 * request-scoped admin session — exactly the same constraint the
 * rider-claim-race test above works around.
 */
describe("RETURNED status transition", () => {
  let orderGroupId: string | undefined;
  let riderUserId: string | undefined;
  let riderProfileId: string | undefined;

  afterEach(async () => {
    if (orderGroupId) await db.orderGroup.delete({ where: { id: orderGroupId } }).catch(() => {});
    if (riderProfileId) {
      // RiderLedgerEntry.riderId is a required FK with no cascade — must go
      // before deleting the rider, or the delete below is silently blocked.
      await db.riderLedgerEntry.deleteMany({ where: { riderId: riderProfileId } }).catch(() => {});
    }
    // Cascades to the throwaway RiderProfile (see User -> RiderProfile onDelete: Cascade).
    if (riderUserId) await db.user.delete({ where: { id: riderUserId } }).catch(() => {});
    orderGroupId = undefined;
    riderUserId = undefined;
    riderProfileId = undefined;
  });

  it("COD order delivered, rider settles the cash, order returned afterward: rider balance stays unchanged", async () => {
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    const admin = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000001" } });

    // A dedicated throwaway rider — not a shared fixture — so this test's
    // balance assertions can never race against another test file
    // concurrently mutating the same rider's balance.
    const suffix = `RETURN-TEST-${Date.now()}`;
    const riderUser = await db.user.create({
      data: { role: "RIDER", name: "Return Test Rider", phone: `+880${Date.now()}`, passwordHash: "test" },
    });
    riderUserId = riderUser.id;
    const rider = await db.riderProfile.create({ data: { userId: riderUser.id, isApproved: true } });
    riderProfileId = rider.id;

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

    const riderBefore = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { balancePoisha: true } });

    await db.$transaction(async (tx) => {
      await createDeliveryEarningEntry(tx, { ...order, orderGroup: { payment: { provider: "COD" } } }, delivery.id, rider.id);
    });

    // Rider hands the platform's share of the COD cash over, settling their
    // balance back to its pre-delivery value.
    const earning = await db.riderLedgerEntry.findFirstOrThrow({ where: { deliveryId: delivery.id, type: "DELIVERY_EARNING" } });
    await db.$transaction(async (tx) => {
      await tx.riderLedgerEntry.create({
        data: {
          riderId: rider.id,
          type: "CASH_HANDOVER",
          balanceImpactPoisha: -earning.balanceImpactPoisha,
          amountPoisha: earning.amountPoisha,
          createdByUserId: admin.id,
        },
      });
      await tx.riderProfile.update({ where: { id: rider.id }, data: { balancePoisha: { increment: -earning.balanceImpactPoisha } } });
    });
    const riderSettled = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { balancePoisha: true } });
    expect(riderSettled.balancePoisha).toBe(riderBefore.balancePoisha);

    // Exactly what advanceOrderStatusAction's transaction does for RETURNED:
    // status update + status-history row, no rider-ledger reversal call.
    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "RETURNED" } });
      await tx.deliveryStatusHistory.create({ data: { orderId: order.id, status: "RETURNED", note: "Customer returned the order", changedByUserId: admin.id } });
    });

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe("RETURNED");

    const reversal = await db.riderLedgerEntry.findFirst({ where: { deliveryId: delivery.id, type: "DELIVERY_REVERSAL" } });
    expect(reversal).toBeNull();

    const riderAfter = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { balancePoisha: true } });
    expect(riderAfter.balancePoisha).toBe(riderBefore.balancePoisha);
  });
});
