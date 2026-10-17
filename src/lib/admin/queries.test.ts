// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { getAdminOverviewStats } from "./queries";

/**
 * Regression coverage for FIN-2: the admin dashboard's "Pending refunds"
 * card used to count only status = REQUESTED, silently excluding APPROVED
 * refunds (approved but not yet PROCESSED, i.e. the money hasn't moved
 * yet) — understating a real, pending financial obligation. The Finance
 * page's getFinanceRefundsSummary already used the correct rule; this
 * brings the main dashboard in line with it.
 */
describe("getAdminOverviewStats — pending refunds", () => {
  let orderGroupId: string | undefined;
  let refundId: string | undefined;

  afterEach(async () => {
    if (refundId) await db.refund.delete({ where: { id: refundId } }).catch(() => {});
    if (orderGroupId) await db.orderGroup.delete({ where: { id: orderGroupId } }).catch(() => {});
    orderGroupId = refundId = undefined;
  });

  it("counts an APPROVED refund in pendingRefunds, not just REQUESTED", async () => {
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const suffix = `FIN2-TEST-${Date.now()}`;
    const orderGroup = await db.orderGroup.create({
      data: { groupNumber: suffix, customerId: customer.id, subtotal: 100, deliveryFeeTotal: 0, grandTotal: 100 },
    });
    orderGroupId = orderGroup.id;
    const payment = await db.payment.create({ data: { orderGroupId: orderGroup.id, provider: "COD", amount: 100, isSandbox: true } });

    const before = await getAdminOverviewStats();

    const refund = await db.refund.create({
      data: { paymentId: payment.id, amount: 100, reason: "FIN-2 regression test", status: "APPROVED" },
    });
    refundId = refund.id;

    const after = await getAdminOverviewStats();
    expect(after.pendingRefunds - before.pendingRefunds).toBe(1);
    expect(after.pendingRefundsAmount - before.pendingRefundsAmount).toBeCloseTo(100, 2);
  });
});
