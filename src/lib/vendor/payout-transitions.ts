import "server-only";
import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { getVendorPayoutBalance } from "@/lib/vendor/payout-balance";
import type { PayoutStatus, UserRole } from "@/generated/prisma/client";

/** Every status a payout is allowed to move to, and which status(es) it must currently be in to make that move. */
const VALID_FROM_STATUSES: Record<string, PayoutStatus[]> = {
  APPROVED: ["PENDING"],
  REJECTED: ["PENDING", "APPROVED"],
  PAID: ["APPROVED"],
};

/** Moving to APPROVED or PAID commits real money — must still be covered by the vendor's balance at the moment of the transition, not just when it was first requested. */
const STATUSES_REQUIRING_ELIGIBILITY: PayoutStatus[] = ["APPROVED", "PAID"];

type Actor = { id: string; role: UserRole };
type TransitionExtras = { referenceNo?: string; adminNote?: string };

/**
 * Moves a payout to `targetStatus` only if it's currently in one of the
 * statuses that transition is allowed from, AND — for APPROVED/PAID — only
 * if the vendor's balance still covers it right now. Records an audit log
 * entry for it — all inside one transaction, so they can never disagree (a
 * crash partway through would otherwise leave a status change with no
 * audit trail, or vice versa).
 *
 * The eligibility re-check matters because a request can be created when
 * the vendor's earnings fully covered it, and then stop being covered
 * later — e.g. a refund on one of the orders behind those earnings removes
 * it from the DELIVERED-only earnings aggregate after the request was
 * already sitting PENDING. This is the one request's own amount, re-tested
 * against (earnings − paid − reserved-by-OTHER-requests): since this
 * request is itself PENDING/APPROVED, it's already counted in
 * getVendorPayoutBalance's `reserved`, so "reserved by others" subtracts
 * its own amount back out first.
 *
 * Locks the payout row first (`SELECT ... FOR UPDATE`, transaction-scoped —
 * safe with a transaction-mode pooler) rather than a conditional
 * `updateMany`, specifically so the audit entry can record the *exact*
 * status this transition moved from — `updateMany`'s WHERE clause alone
 * can't tell you which of several allowed from-statuses it actually
 * matched (REJECTED is reachable from either PENDING or APPROVED). A
 * double-click or two admins racing to process the same payout can only
 * ever have one of them pass the lock-then-check; the loser returns
 * `false` and writes nothing — no status change, no audit entry.
 */
export async function transitionPayoutStatus(payoutId: string, targetStatus: string, actor: Actor, extras: TransitionExtras = {}): Promise<boolean> {
  const allowedFrom = VALID_FROM_STATUSES[targetStatus];
  if (!allowedFrom) return false;

  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: PayoutStatus; vendorId: string; amount: string }[]>`
      SELECT status, "vendorId", amount FROM "VendorPayout" WHERE id = ${payoutId} FOR UPDATE
    `;
    const current = rows[0];
    if (!current || !allowedFrom.includes(current.status)) return false;

    const amount = Number(current.amount);

    if (STATUSES_REQUIRING_ELIGIBILITY.includes(targetStatus as PayoutStatus)) {
      const balance = await getVendorPayoutBalance(current.vendorId, tx);
      const reservedByOthers = balance.reserved - amount;
      const availableForThisRequest = balance.earnings - balance.paid - reservedByOthers;
      if (availableForThisRequest < amount) return false;
    }

    await tx.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: targetStatus as PayoutStatus,
        // REJECTED gets a processedAt too — it's "when this request was
        // finalized," not strictly "when paid," and nothing else in the
        // codebase assumes processedAt is PAID-only (every reader filters
        // on status explicitly, e.g. admin/money.ts and admin/finance.ts
        // both filter `status: "PAID"` before reading processedAt).
        processedAt: targetStatus === "PAID" || targetStatus === "REJECTED" ? new Date() : undefined,
        referenceNo: extras.referenceNo || undefined,
        adminNote: extras.adminNote || undefined,
      },
    });

    await recordAuditLog(
      {
        actorUserId: actor.id,
        action: "VENDOR_PAYOUT_STATUS_CHANGED",
        entityType: "VendorPayout",
        entityId: payoutId,
        metadata: {
          actorRole: actor.role,
          vendorId: current.vendorId,
          amount,
          fromStatus: current.status,
          toStatus: targetStatus,
        },
      },
      tx,
    );

    return true;
  });
}
