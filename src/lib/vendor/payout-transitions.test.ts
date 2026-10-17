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
 */
describe("transitionPayoutStatus", () => {
  let vendorUserId: string | undefined;
  let vendorId: string | undefined;
  const payoutIds: string[] = [];

  afterEach(async () => {
    for (const id of payoutIds.splice(0)) await db.vendorPayout.delete({ where: { id } }).catch(() => {});
    if (vendorId) await db.vendor.delete({ where: { id: vendorId } }).catch(() => {});
    if (vendorUserId) await db.user.delete({ where: { id: vendorUserId } }).catch(() => {});
    vendorUserId = vendorId = undefined;
  });

  async function setupPayout(status: "PENDING" | "APPROVED" | "PAID" | "REJECTED") {
    if (!vendorId) {
      const suffix = `transition-test-${Date.now()}`;
      const user = await db.user.create({ data: { role: "VENDOR", name: "Transition Test Vendor", phone: `+8805${Date.now()}`, passwordHash: "test" } });
      vendorUserId = user.id;
      const vendor = await db.vendor.create({
        data: { userId: user.id, businessName: `Transition Test Vendor ${suffix}`, slug: suffix, businessType: "GROCERY_VENDOR", phone: user.phone, email: `${suffix}@example.com`, addressText: "Test address" },
      });
      vendorId = vendor.id;
    }
    const now = new Date();
    const payout = await db.vendorPayout.create({ data: { vendorId: vendorId!, amount: 100, status, periodStart: now, periodEnd: now } });
    payoutIds.push(payout.id);
    return payout;
  }

  it("PENDING -> APPROVED succeeds", async () => {
    const payout = await setupPayout("PENDING");
    const ok = await transitionPayoutStatus(payout.id, "APPROVED");
    expect(ok).toBe(true);
    const updated = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe("APPROVED");
  });

  it("rejects an invalid transition (PENDING -> PAID, skipping APPROVED)", async () => {
    const payout = await setupPayout("PENDING");
    const ok = await transitionPayoutStatus(payout.id, "PAID");
    expect(ok).toBe(false);
    const unchanged = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(unchanged.status).toBe("PENDING");
  });

  it("a second attempt to approve an already-APPROVED payout fails (no silent double-processing)", async () => {
    const payout = await setupPayout("APPROVED");
    const ok = await transitionPayoutStatus(payout.id, "APPROVED");
    expect(ok).toBe(false);
  });

  it("a double-click (two concurrent identical transitions) on the same PENDING payout only succeeds once", async () => {
    const payout = await setupPayout("PENDING");
    // Both calls target the same status — REJECTED is deliberately NOT in
    // its own allowed-from list, so only the first can ever match.
    const [first, second] = await Promise.all([transitionPayoutStatus(payout.id, "REJECTED"), transitionPayoutStatus(payout.id, "REJECTED")]);
    const successes = [first, second].filter(Boolean).length;
    expect(successes).toBe(1);
  });

  it("APPROVED -> PAID succeeds and sets processedAt", async () => {
    const payout = await setupPayout("APPROVED");
    const ok = await transitionPayoutStatus(payout.id, "PAID");
    expect(ok).toBe(true);
    const updated = await db.vendorPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe("PAID");
    expect(updated.processedAt).not.toBeNull();
  });
});
