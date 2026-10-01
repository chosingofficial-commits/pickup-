import "server-only";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import { getPeriodStart, type PeriodKey } from "./balance";

export function toPoisha(taka: number): number {
  return Math.round(taka * 100);
}

export function fromPoisha(poisha: number): number {
  return poisha / 100;
}

/**
 * `amountPoisha` on a DELIVERY_EARNING/DELIVERY_REVERSAL entry means two
 * different things depending on payment method: for COD it's the full order
 * total the rider physically collected in cash; for an online-paid order the
 * rider never touches any cash, so it's their earning share instead. Showing
 * either number under a generic "Collected" label is wrong for the other
 * case — every UI that displays this must go through here instead of
 * formatting amountPoisha directly.
 */
export function formatCollectedLabel(isCod: boolean | null | undefined, amountPoisha: number): string {
  return isCod ? `Collected: ${formatBDT(fromPoisha(amountPoisha))}` : "Paid online";
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

/** Shared by the aggregate total and the itemized list, so they can never disagree. */
function todayCashCollectedWhere(riderId: string) {
  return {
    riderId,
    type: "DELIVERY_EARNING" as const,
    occurredAt: { gte: getPeriodStart("today") },
    delivery: { isCod: true },
  };
}

export async function getTodayCashCollected(riderId: string): Promise<number> {
  const agg = await db.riderLedgerEntry.aggregate({
    where: todayCashCollectedWhere(riderId),
    _sum: { amountPoisha: true },
  });
  // For a COD delivery, amountPoisha on the earning entry is the full order
  // total the rider collected in cash (not just their own earning share).
  return Number(agg._sum.amountPoisha ?? 0);
}

/** Per-order breakdown behind getTodayCashCollected's total — same where-clause, so the sum always matches. */
export async function getTodayCashCollectedEntries(riderId: string) {
  return db.riderLedgerEntry.findMany({
    where: todayCashCollectedWhere(riderId),
    include: {
      delivery: { include: { order: { select: { orderNumber: true, vendor: { select: { businessName: true } }, customer: { select: { name: true } } } } } },
    },
    orderBy: { occurredAt: "desc" },
  });
}

/** Every rider's current balance + today's cash collected, for the admin list screen. */
export async function getAllRidersBalanceSummary(riderIds: string[]) {
  const startOfToday = getPeriodStart("today")!;
  const collectedByRider = await db.riderLedgerEntry.groupBy({
    by: ["riderId"],
    where: { riderId: { in: riderIds }, type: "DELIVERY_EARNING", occurredAt: { gte: startOfToday }, delivery: { isCod: true } },
    _sum: { amountPoisha: true },
  });
  const map = new Map(collectedByRider.map((r) => [r.riderId, Number(r._sum.amountPoisha ?? 0)]));
  return (riderId: string) => map.get(riderId) ?? 0;
}

export type RiderPaymentSummary = {
  platformEarningsPoisha: number;
  cashCollectedPoisha: number;
  receivedFromRidersPoisha: number;
  paidToRidersPoisha: number;
  stillToCollectPoisha: number;
  weOweRidersPoisha: number;
};

/**
 * Admin payment overview. "Delivered deliveries" is deliberately filtered by
 * the order's CURRENT status ("DELIVERED"), not just the presence of a
 * DELIVERY_EARNING entry — a later RETURNED/REFUNDED moves the order off
 * DELIVERED (see advanceOrderStatusAction), so this naturally nets out
 * reversed deliveries without needing to join the reversal ledger rows.
 */
export async function getRiderPaymentSummary(period: PeriodKey): Promise<RiderPaymentSummary> {
  const since = getPeriodStart(period);
  const deliveredFilter = { deliveredAt: since ? { gte: since } : undefined, order: { status: "DELIVERED" as const } };
  const occurredFilter = since ? { gte: since } : undefined;

  const [earnings, cashCollected, received, paid, stillToCollect, weOwe] = await Promise.all([
    db.delivery.aggregate({ where: deliveredFilter, _sum: { platformDeliverySharePoisha: true } }),
    db.delivery.aggregate({ where: { ...deliveredFilter, isCod: true }, _sum: { orderTotalPoisha: true } }),
    db.riderLedgerEntry.aggregate({ where: { type: "CASH_HANDOVER", occurredAt: occurredFilter }, _sum: { amountPoisha: true } }),
    db.riderLedgerEntry.aggregate({ where: { type: "PAYOUT", occurredAt: occurredFilter }, _sum: { amountPoisha: true } }),
    db.riderProfile.aggregate({ where: { balancePoisha: { gt: 0 } }, _sum: { balancePoisha: true } }),
    db.riderProfile.aggregate({ where: { balancePoisha: { lt: 0 } }, _sum: { balancePoisha: true } }),
  ]);

  return {
    platformEarningsPoisha: earnings._sum.platformDeliverySharePoisha ?? 0,
    cashCollectedPoisha: cashCollected._sum.orderTotalPoisha ?? 0,
    receivedFromRidersPoisha: received._sum.amountPoisha ?? 0,
    paidToRidersPoisha: paid._sum.amountPoisha ?? 0,
    stillToCollectPoisha: stillToCollect._sum.balancePoisha ?? 0,
    weOweRidersPoisha: Math.abs(weOwe._sum.balancePoisha ?? 0),
  };
}

