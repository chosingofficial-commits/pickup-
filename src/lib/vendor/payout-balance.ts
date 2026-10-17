import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type VendorPayoutBalance = {
  earnings: number;
  /** Payouts with status PENDING or APPROVED — money already committed but not yet paid out. */
  reserved: number;
  paid: number;
  available: number;
};

/**
 * The one authoritative "how much can this vendor withdraw right now"
 * calculation — used by the vendor payouts page, the vendor dashboard,
 * requestPayoutAction, and every admin "owed to vendors" figure, so they can
 * never disagree again.
 *
 * `reserved` deliberately includes APPROVED alongside PENDING — APPROVED is
 * a real, normal intermediate state before PAID (see the admin payouts
 * page's own "Mark paid" button, which only appears for APPROVED rows), and
 * excluding it let a vendor request a second payout for money an admin had
 * already approved but not yet marked paid.
 *
 * Pass `vendorId` for a single vendor's balance, or omit it for the
 * platform-wide total (every vendor combined) — the same formula either
 * way, so the admin-wide "owed to vendors" figure can never drift from the
 * per-vendor one. Pass `client` (a transaction) to compute this balance
 * consistently with a write happening in the same transaction.
 */
export async function getVendorPayoutBalance(vendorId?: string, client: Prisma.TransactionClient = db): Promise<VendorPayoutBalance> {
  const vendorFilter = vendorId ? { vendorId } : {};

  const [earningsAgg, reservedAgg, paidAgg] = await Promise.all([
    client.commissionEntry.aggregate({ where: { ...vendorFilter, order: { status: "DELIVERED" } }, _sum: { vendorEarnings: true } }),
    client.vendorPayout.aggregate({ where: { ...vendorFilter, status: { in: ["PENDING", "APPROVED"] } }, _sum: { amount: true } }),
    client.vendorPayout.aggregate({ where: { ...vendorFilter, status: "PAID" }, _sum: { amount: true } }),
  ]);

  const earnings = Number(earningsAgg._sum.vendorEarnings ?? 0);
  const reserved = Number(reservedAgg._sum.amount ?? 0);
  const paid = Number(paidAgg._sum.amount ?? 0);
  return { earnings, reserved, paid, available: earnings - reserved - paid };
}
