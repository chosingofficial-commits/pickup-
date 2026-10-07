// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createDeliveryEarningEntry } from "./orders";
import { syncOrderStatusForProcessedRefund } from "./refunds";

/**
 * Regression test for the bug found in item #5's commission audit:
 * processing a refund only ever updated Payment.status, never Order.status
 * — so a refunded order kept counting its commission/vendor-earnings in
 * every aggregate that filters on order.status === "DELIVERED" (admin
 * "Commission revenue", vendor payouts). Confirmed against production
 * (read-only): exactly one existing order was affected this way.
 *
 * A second production read confirmed a fix regression risk: the rider who
 * delivered that order had already collected COD cash and handed the
 * platform's share over (balance settled to 0) *before* the refund was
 * processed. Reversing the rider's ledger entry at refund time — the first
 * draft of this fix — would have left the platform owing the rider money it
 * never actually gave back, which is wrong: the rider did the delivery and
 * already settled the cash, so a refund afterward is a platform/vendor-side
 * event only and must never touch the rider's ledger.
 */
describe("syncOrderStatusForProcessedRefund", () => {
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

  async function createDeliveredOrderWithRiderEarning() {
    const vendorUser = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000002" } });
    const vendor = await db.vendor.findUniqueOrThrow({ where: { userId: vendorUser.id } });
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });

    // A dedicated throwaway rider — not a shared fixture — so this test's
    // balance assertions can never race against another test file
    // concurrently mutating the same rider's balance.
    const riderUser = await db.user.create({
      data: { role: "RIDER", name: "Refund Test Rider", phone: `+881${Date.now()}`, passwordHash: "test" },
    });
    riderUserId = riderUser.id;
    const rider = await db.riderProfile.create({ data: { userId: riderUser.id, isApproved: true } });
    riderProfileId = rider.id;

    const suffix = `REFUND-TEST-${Date.now()}`;
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
    await db.commissionEntry.create({
      data: { orderId: order.id, vendorId: vendor.id, ratePct: 10, commissionAmount: 10, vendorEarnings: 90 },
    });
    const delivery = await db.delivery.create({ data: { orderId: order.id, riderId: rider.id, deliveredAt: new Date() } });

    const riderBefore = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { balancePoisha: true } });

    await db.$transaction(async (tx) => {
      await createDeliveryEarningEntry(
        tx,
        { ...order, orderGroup: { payment: { provider: "COD" } } },
        delivery.id,
        rider.id,
      );
    });

    return { order, delivery, vendor, rider, riderBalanceBefore: riderBefore.balancePoisha };
  }

  it("moves the order to REFUNDED but never touches the rider's ledger or balance", async () => {
    const { order, delivery, vendor, rider, riderBalanceBefore } = await createDeliveredOrderWithRiderEarning();
    const admin = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000001" } });

    const earning = await db.riderLedgerEntry.findFirstOrThrow({ where: { deliveryId: delivery.id, type: "DELIVERY_EARNING" } });
    const riderBalanceAfterDelivery = riderBalanceBefore + earning.balanceImpactPoisha;

    await db.$transaction(async (tx) => {
      await syncOrderStatusForProcessedRefund(tx, { id: order.id, status: "DELIVERED", vendor: { businessType: vendor.businessType } }, admin.id);
    });

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe("REFUNDED");

    const reversal = await db.riderLedgerEntry.findFirst({ where: { deliveryId: delivery.id, type: "DELIVERY_REVERSAL" } });
    expect(reversal).toBeNull();

    const riderAfter = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { balancePoisha: true } });
    expect(riderAfter.balancePoisha).toBe(riderBalanceAfterDelivery);

    // The whole point: once REFUNDED, this order must drop out of every
    // aggregate that counts "live" vendor commission/earnings.
    const stillCounted = await db.commissionEntry.aggregate({
      where: { orderId: order.id, order: { status: "DELIVERED" } },
      _sum: { commissionAmount: true },
    });
    expect(stillCounted._sum.commissionAmount).toBeNull();
  });

  it("COD order delivered, rider settles the cash, refund processed afterward: rider balance stays unchanged", async () => {
    const { order, delivery, vendor, rider, riderBalanceBefore } = await createDeliveredOrderWithRiderEarning();
    const admin = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000001" } });

    // Rider hands the platform's share of the COD cash over, settling their
    // balance back to its pre-delivery value — same shape as the real
    // CASH_HANDOVER action in lib/actions/admin-riders.ts.
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
    expect(riderSettled.balancePoisha).toBe(riderBalanceBefore);

    await db.$transaction(async (tx) => {
      await syncOrderStatusForProcessedRefund(tx, { id: order.id, status: "DELIVERED", vendor: { businessType: vendor.businessType } }, admin.id);
    });

    const riderAfterRefund = await db.riderProfile.findUniqueOrThrow({ where: { id: rider.id }, select: { balancePoisha: true } });
    expect(riderAfterRefund.balancePoisha).toBe(riderBalanceBefore);

    const reversal = await db.riderLedgerEntry.findFirst({ where: { deliveryId: delivery.id, type: "DELIVERY_REVERSAL" } });
    expect(reversal).toBeNull();
  });

  it("is a no-op for an order that can't legally move to REFUNDED (e.g. still ORDER_PLACED)", async () => {
    const { order, delivery, vendor } = await createDeliveredOrderWithRiderEarning();
    await db.order.update({ where: { id: order.id }, data: { status: "ORDER_PLACED" } });

    await db.$transaction(async (tx) => {
      await syncOrderStatusForProcessedRefund(tx, { id: order.id, status: "ORDER_PLACED", vendor: { businessType: vendor.businessType } }, "irrelevant-user-id");
    });

    const unchangedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(unchangedOrder.status).toBe("ORDER_PLACED");
    const reversal = await db.riderLedgerEntry.findFirst({ where: { deliveryId: delivery.id, type: "DELIVERY_REVERSAL" } });
    expect(reversal).toBeNull();
  });
});
