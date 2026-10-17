// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { transitionPayoutStatus } from "./payout-transitions";

/**
 * Regression coverage for the admin payout-status half of FIN-1/FIN-3:
 * updatePayoutStatusAction used to update unconditionally, with no check on
 * the payout's current status — so a double-click, or two admins acting on
 * the same stale page, could both "succeed" (e.g. PAID twice, or REJECTED
 * after already PAID). The conditional UPDATE here makes only one caller
 * ever actually change anything.
 *
 * Also covers the audit-trail gap found in review: the status change and
 * its AuditLog entry now happen in the same transaction, and only when the
 * transition actually applies (count === 1) — a rejected or duplicate
 * click writes no log entry.
 *
 * And the admin payouts feature's server-side eligibility re-check:
 * APPROVED/PAID must still be covered by the vendor's balance *at the
 * moment of the transition* — a request can lose that coverage after being
 * created (e.g. a refund on one of the backing orders), and the server
 * must catch that even if the UI's disabled button was bypassed.
 */
describe("transitionPayoutStatus", () => {
  let vendorUserId: string | undefined;
  let vendorId: string | undefined;
  const payoutIds: string[] = [];
  const orderGroupIds: string[] = [];

  // AuditLog.actorUserId is a real FK — must be a seeded user, not a made-up id.
  async function actor() {
    const admin = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000001" } });
    return { id: admin.id, role: "ADMIN" as const };
  }

  afterEach(async () => {
    for (const id of payoutIds.splice(0)) {
      await db.auditLog.deleteMany({ where: { entityType: "VendorPayout", entityId: id } }).catch(() => {});
      await db.vendorPayout.delete({ where: { id } }).catch(() => {});
    }
    for (const id of orderGroupIds.splice(0)) await db.orderGroup.delete({ where: { id } }).catch(() => {});
    if (vendorId) await db.vendor.delete({ where: { id: vendorId } }).catch(() => {});
    if (vendorUserId) await db.user.delete({ where: { id: vendorUserId } }).catch(() => {});
    vendorUserId = vendorId = undefined;
  });

  async function ensureVendor() {
    if (vendorId) return vendorId;
    const suffix = `transition-test-${Date.now()}`;
    const user = await db.user.create({ data: { role: "VENDOR", name: "Transition Test Vendor", phone: `+8805${Date.now()}`, passwordHash: "test" } });
    vendorUserId = user.id;
    const vendor = await db.vendor.create({
      data: { userId: user.id, businessName: `Transition Test Vendor ${suffix}`, slug: suffix, businessType: "GROCERY_VENDOR", phone: user.phone, email: `${suffix}@example.com`, addressText: "Test address", commissionRatePct: 0 },
    });
    vendorId = vendor.id;
    return vendorId;
  }

  /** Creates a DELIVERED order (real earnings) for the vendor so an APPROVED/PAID transition has something to be eligible against. */
  async function createEarnings(amount: number) {
    const vid = await ensureVendor();
    const customer = await db.user.findUniqueOrThrow({ where: { phone: "+8801700000008" } });
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: address.neighbourhoodId ?? undefined } });
    const suffix = `TRANS-ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const orderGroup = await db.orderGroup.create({ data: { groupNumber: suffix, customerId: customer.id, subtotal: amount, deliveryFeeTotal: 0, grandTotal: amount } });
    orderGroupIds.push(orderGroup.id);
    const order = await db.order.create({
      data: {
        orderNumber: suffix,
        orderGroupId: orderGroup.id,
        customerId: customer.id,
        vendorId: vid,
        addressId: address.id,
        deliveryZoneId: zone.id,
        status: "DELIVERED",
        subtotal: amount,
        deliveryFee: 0,
        total: amount,
        commissionRatePct: 0,
        commissionAmount: 0,
        vendorEarnings: amount,
      },
    });
    await db.commissionEntry.create({ data: { orderId: order.id, vendorId: vid, ratePct: 0, commissionAmount: 0, vendorEarnings: amount } });
    return order;
  }

  async function setupPayout(status: "PENDING" | "APPROVED" | "PAID" | "REJECTED", amount = 100) {
    const vid = await ensureVendor();
    const now = new Date();
    const payout = await db.vendorPayout.create({ data: { vendorId: vid, amount, status, periodStart: now, periodEnd: now } });
    payoutIds.push(payout.id);
    return payout;
  }

  it("PENDING -> APPROVED succeeds when earnings cover the amount", async () => {
    await createEarnings(100);
    const payout = await setupPayout("PENDING", 100);
    const ok = await transitionPayoutStatus(payout.id, "APPROVED", await actor());
    expect(ok).toBe(true);
    const updated = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe("APPROVED");
  });

  it("rejects an invalid transition (PENDING -> PAID, skipping APPROVED)", async () => {
    await createEarnings(100);
    const payout = await setupPayout("PENDING", 100);
    const ok = await transitionPayoutStatus(payout.id, "PAID", await actor());
    expect(ok).toBe(false);
    const unchanged = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(unchanged.status).toBe("PENDING");
  });

  it("a second attempt to approve an already-APPROVED payout fails (no silent double-processing)", async () => {
    await createEarnings(100);
    const payout = await setupPayout("APPROVED", 100);
    const ok = await transitionPayoutStatus(payout.id, "APPROVED", await actor());
    expect(ok).toBe(false);
  });

  it("a double-click (two concurrent identical transitions) on the same PENDING payout only succeeds once", async () => {
    await createEarnings(100);
    const payout = await setupPayout("PENDING", 100);
    const who = await actor();
    // Both calls target the same status — REJECTED is deliberately NOT in
    // its own allowed-from list, so only the first can ever match.
    const [first, second] = await Promise.all([transitionPayoutStatus(payout.id, "REJECTED", who), transitionPayoutStatus(payout.id, "REJECTED", who)]);
    const successes = [first, second].filter(Boolean).length;
    expect(successes).toBe(1);
  });

  it("APPROVED -> PAID succeeds and sets processedAt, when earnings cover the amount", async () => {
    await createEarnings(100);
    const payout = await setupPayout("APPROVED", 100);
    const ok = await transitionPayoutStatus(payout.id, "PAID", await actor());
    expect(ok).toBe(true);
    const updated = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe("PAID");
    expect(updated.processedAt).not.toBeNull();
  });

  it("REJECTED also sets processedAt (it's 'when finalized', not only 'when paid')", async () => {
    await createEarnings(100);
    const payout = await setupPayout("PENDING", 100);
    const ok = await transitionPayoutStatus(payout.id, "REJECTED", await actor());
    expect(ok).toBe(true);
    const updated = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.processedAt).not.toBeNull();
  });

  it("a valid transition writes exactly one audit log entry with the correct fields", async () => {
    await createEarnings(250);
    const payout = await setupPayout("PENDING", 250);
    const who = await actor();
    const ok = await transitionPayoutStatus(payout.id, "APPROVED", who);
    expect(ok).toBe(true);

    const logs = await db.auditLog.findMany({ where: { entityType: "VendorPayout", entityId: payout.id } });
    expect(logs).toHaveLength(1);
    const log = logs[0]!;
    expect(log.actorUserId).toBe(who.id);
    expect(log.action).toBe("VENDOR_PAYOUT_STATUS_CHANGED");
    expect(log.metadata).toMatchObject({
      actorRole: "ADMIN",
      vendorId,
      amount: 250,
      fromStatus: "PENDING",
      toStatus: "APPROVED",
    });
  });

  it("an invalid transition writes zero audit log entries", async () => {
    await createEarnings(100);
    const payout = await setupPayout("PENDING", 100);
    const ok = await transitionPayoutStatus(payout.id, "PAID", await actor());
    expect(ok).toBe(false);

    const logs = await db.auditLog.findMany({ where: { entityType: "VendorPayout", entityId: payout.id } });
    expect(logs).toHaveLength(0);
  });

  it("two concurrent identical transitions write exactly one audit log entry", async () => {
    await createEarnings(100);
    const payout = await setupPayout("PENDING", 100);
    const who = await actor();
    await Promise.all([transitionPayoutStatus(payout.id, "REJECTED", who), transitionPayoutStatus(payout.id, "REJECTED", who)]);

    const logs = await db.auditLog.findMany({ where: { entityType: "VendorPayout", entityId: payout.id } });
    expect(logs).toHaveLength(1);
  });

  // ---------------------------------------------------------------------
  // Eligibility re-check (server-side enforcement, not just the UI)
  // ---------------------------------------------------------------------

  it("refuses to APPROVE when the vendor's earnings no longer cover the amount (e.g. a refund after the request)", async () => {
    const order = await createEarnings(300);
    const payout = await setupPayout("PENDING", 300);

    // Simulate the backing order being refunded after the payout was
    // requested — it drops out of the DELIVERED-only earnings aggregate,
    // so the balance that covered this request when it was created no
    // longer does.
    await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });

    const ok = await transitionPayoutStatus(payout.id, "APPROVED", await actor());
    expect(ok).toBe(false);
    const unchanged = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(unchanged.status).toBe("PENDING");

    const logs = await db.auditLog.findMany({ where: { entityType: "VendorPayout", entityId: payout.id } });
    expect(logs).toHaveLength(0);
  });

  it("refuses to mark PAID when the vendor's earnings no longer cover the amount", async () => {
    const order = await createEarnings(300);
    const payout = await setupPayout("APPROVED", 300);
    await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });

    const ok = await transitionPayoutStatus(payout.id, "PAID", await actor());
    expect(ok).toBe(false);
    const unchanged = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(unchanged.status).toBe("APPROVED");
  });

  it("REJECTED needs no eligibility check — always allowed from PENDING/APPROVED regardless of balance", async () => {
    // Deliberately no createEarnings() — zero balance behind this request.
    const payout = await setupPayout("PENDING", 500);
    const ok = await transitionPayoutStatus(payout.id, "REJECTED", await actor());
    expect(ok).toBe(true);
  });
});
