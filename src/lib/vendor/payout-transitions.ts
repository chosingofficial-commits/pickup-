import "server-only";
import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import type { PayoutStatus, UserRole } from "@/generated/prisma/client";

/** Every status a payout is allowed to move to, and which status(es) it must currently be in to make that move. */
const VALID_FROM_STATUSES: Record<string, PayoutStatus[]> = {
  APPROVED: ["PENDING"],
  REJECTED: ["PENDING", "APPROVED"],
  PAID: ["APPROVED"],
};

type Actor = { id: string; role: UserRole };

/**
 * Moves a payout to `targetStatus` only if it's currently in one of the
 * statuses that transition is allowed from, and records an audit log entry
 * for it — both inside one transaction, so they can never disagree (a crash
 * between the two would otherwise leave a status change with no audit
 * trail, or vice versa).
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
export async function transitionPayoutStatus(payoutId: string, targetStatus: string, actor: Actor): Promise<boolean> {
  const allowedFrom = VALID_FROM_STATUSES[targetStatus];
  if (!allowedFrom) return false;

  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: PayoutStatus; vendorId: string; amount: string }[]>`
      SELECT status, "vendorId", amount FROM "VendorPayout" WHERE id = ${payoutId} FOR UPDATE
    `;
    const current = rows[0];
    if (!current || !allowedFrom.includes(current.status)) return false;

    await tx.vendorPayout.update({
      where: { id: payoutId },
      data: { status: targetStatus as PayoutStatus, processedAt: targetStatus === "PAID" ? new Date() : undefined },
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
          amount: Number(current.amount),
          fromStatus: current.status,
          toStatus: targetStatus,
        },
      },
      tx,
    );

    return true;
  });
}
