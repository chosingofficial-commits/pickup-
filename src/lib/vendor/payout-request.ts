import "server-only";
import { db } from "@/lib/db";
import { getVendorPayoutBalance } from "./payout-balance";

export type PayoutRequestResult = { ok: true } | { ok: false; available: number };

/**
 * Locks the vendor's row for the duration of this transaction (a plain
 * `SELECT ... FOR UPDATE` — short-lived and transaction-scoped, so it's safe
 * through a transaction-mode pooler), then recomputes the balance inside
 * that same lock before validating and inserting. This is what actually
 * stops a double-spend: two near-simultaneous requests can no longer both
 * read the same stale "available" snapshot, because the second one doesn't
 * get to read the balance until the first's transaction has committed (or
 * rolled back) and released the lock.
 */
export async function createVendorPayoutRequest(vendorId: string, amount: number): Promise<PayoutRequestResult> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Vendor" WHERE id = ${vendorId} FOR UPDATE`;

    const balance = await getVendorPayoutBalance(vendorId, tx);
    if (amount > balance.available) return { ok: false, available: balance.available };

    const now = new Date();
    await tx.vendorPayout.create({
      data: {
        vendorId,
        amount,
        status: "PENDING",
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: now,
      },
    });
    return { ok: true };
  });
}
