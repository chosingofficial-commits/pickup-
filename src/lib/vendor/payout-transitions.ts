import "server-only";
import { db } from "@/lib/db";
import type { PayoutStatus } from "@/generated/prisma/client";

/** Every status a payout is allowed to move to, and which status(es) it must currently be in to make that move. */
const VALID_FROM_STATUSES: Record<string, PayoutStatus[]> = {
  APPROVED: ["PENDING"],
  REJECTED: ["PENDING", "APPROVED"],
  PAID: ["APPROVED"],
};

/**
 * Moves a payout to `targetStatus` only if it's currently in one of the
 * statuses that transition is allowed from — a single conditional UPDATE
 * (`WHERE status IN (...)`), so a double-click or two admins racing to
 * process the same payout can only ever have one of them actually change
 * anything. The loser's update matches zero rows, which is how it's told it
 * lost (returned `false`) instead of silently overwriting the winner.
 */
export async function transitionPayoutStatus(payoutId: string, targetStatus: string): Promise<boolean> {
  const allowedFrom = VALID_FROM_STATUSES[targetStatus];
  if (!allowedFrom) return false;

  const result = await db.vendorPayout.updateMany({
    where: { id: payoutId, status: { in: allowedFrom } },
    data: { status: targetStatus as PayoutStatus, processedAt: targetStatus === "PAID" ? new Date() : undefined },
  });
  return result.count === 1;
}
