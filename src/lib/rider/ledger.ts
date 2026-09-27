import "server-only";
import { db } from "@/lib/db";

export function toPoisha(taka: number): number {
  return Math.round(taka * 100);
}

export function fromPoisha(poisha: number): number {
  return poisha / 100;
}

/**
 * Rounding rule (integer poisha math only, never floats):
 *
 *   riderEarning   = round(standardFeePoisha * (100 - ratePct) / 100)
 *   platformShare  = standardFeePoisha - riderEarning
 *
 * platformShare is ALWAYS the remainder, never computed independently from
 * ratePct — that's what guarantees riderEarning + platformShare == standardFee
 * exactly, for every rate, with no possibility of the two disagreeing by a
 * poisha due to rounding in two different places.
 *
 * ratePct can carry up to 2 decimal places (Decimal(5,2), e.g. 17.5 or
 * 33.00). Everything is scaled into integers before any division:
 *   ratePctScaled = round(ratePct * 100)   — e.g. 17.5 -> 1750, 33 -> 3300
 *   keepUnits     = 10000 - ratePctScaled  — out of 10000 (100.00%)
 *   riderEarning  = round(standardFeePoisha * keepUnits / 10000)
 */
export function computeDeliveryEarning(standardFeePoisha: number, ratePct: number): { riderEarningPoisha: number; platformSharePoisha: number } {
  const ratePctScaled = Math.round(ratePct * 100);
  const keepUnits = 10000 - ratePctScaled;
  const riderEarningPoisha = Math.round((standardFeePoisha * keepUnits) / 10000);
  const platformSharePoisha = standardFeePoisha - riderEarningPoisha;
  return { riderEarningPoisha, platformSharePoisha };
}

export async function getRiderBalance(riderId: string): Promise<number> {
  const rider = await db.riderProfile.findUnique({ where: { id: riderId }, select: { balancePoisha: true } });
  return rider?.balancePoisha ?? 0;
}

export async function getRiderLedger(riderId: string, take = 200) {
  return db.riderLedgerEntry.findMany({
    where: { riderId },
    include: { delivery: { include: { order: { include: { vendor: { select: { businessName: true } } } } } }, createdByUser: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getTodayCashCollected(riderId: string): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const agg = await db.riderLedgerEntry.aggregate({
    where: { riderId, type: "DELIVERY_EARNING", occurredAt: { gte: startOfToday }, delivery: { isCod: true } },
    _sum: { amountPoisha: true },
  });
  // For a COD delivery, amountPoisha on the earning entry is the full order
  // total the rider collected in cash (not just their own earning share).
  return Number(agg._sum.amountPoisha ?? 0);
}

/** Every rider's current balance + today's cash collected, for the admin list screen. */
export async function getAllRidersBalanceSummary(riderIds: string[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const collectedByRider = await db.riderLedgerEntry.groupBy({
    by: ["riderId"],
    where: { riderId: { in: riderIds }, type: "DELIVERY_EARNING", occurredAt: { gte: startOfToday }, delivery: { isCod: true } },
    _sum: { amountPoisha: true },
  });
  const map = new Map(collectedByRider.map((r) => [r.riderId, Number(r._sum.amountPoisha ?? 0)]));
  return (riderId: string) => map.get(riderId) ?? 0;
}
