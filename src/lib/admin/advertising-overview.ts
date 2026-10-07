import "server-only";
import { db } from "@/lib/db";
import { getPeriodStart, type PeriodKey } from "@/lib/date/period";

const SLOT_OCCUPYING_STATUSES = ["SCHEDULED", "ACTIVE", "PAUSED"] as const;
const SOON_WINDOW_DAYS = 3;

export type AdIncomeOverview = { paidTk: number; expectedTk: number };

/** "Ad income (paid)" is confirmed AdPayment revenue; "expected" is money already approved/invoiced but not yet confirmed paid. */
export async function getAdIncomeOverview(period: PeriodKey): Promise<AdIncomeOverview> {
  const since = getPeriodStart(period);
  const [paid, pendingPayments, approvedNoPayment] = await Promise.all([
    db.adPayment.aggregate({ where: { status: "PAID", paidAt: since ? { gte: since } : undefined }, _sum: { amount: true } }),
    db.adPayment.aggregate({ where: { status: "PENDING", createdAt: since ? { gte: since } : undefined }, _sum: { amount: true } }),
    db.advertisement.aggregate({ where: { status: "APPROVED", campaigns: { none: {} }, createdAt: since ? { gte: since } : undefined }, _sum: { budget: true } }),
  ]);
  return {
    paidTk: Number(paid._sum.amount ?? 0),
    expectedTk: Number(pendingPayments._sum.amount ?? 0) + Number(approvedNoPayment._sum.budget ?? 0),
  };
}

export type NeedsActionCounts = { newRequests: number; approvedAwaitingPayment: number; paidAwaitingPaymentConfirmation: number };

/** Three distinct queues an admin needs to work through, in order: approve/reject -> create a campaign -> confirm payment. */
export async function getAdsNeedingAction(): Promise<NeedsActionCounts> {
  const [newRequests, approvedAwaitingPayment, paidAwaitingPaymentConfirmation] = await Promise.all([
    db.advertisement.count({ where: { status: "SUBMITTED" } }),
    db.advertisement.count({ where: { status: "APPROVED", campaigns: { none: {} } } }),
    db.adPayment.count({ where: { status: "PENDING" } }),
  ]);
  return { newRequests, approvedAwaitingPayment, paidAwaitingPaymentConfirmation };
}

export type RunningByPlacement = { code: string; name: string; runningCount: number; clicks: number; views: number };

/** Currently-ACTIVE campaigns, grouped by placement, with their aggregate clicks/views (the per-ad breakdown already lives on /admin/advertising/campaigns). */
export async function getRunningAdsByPlacement(): Promise<RunningByPlacement[]> {
  const placements = await db.adPlacement.findMany({
    where: { isActive: true },
    include: {
      campaigns: {
        where: { status: "ACTIVE" },
        include: { _count: { select: { clicks: true, impressions: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return placements.map((p) => ({
    code: p.code,
    name: p.name,
    runningCount: p.campaigns.length,
    clicks: p.campaigns.reduce((sum, c) => sum + c._count.clicks, 0),
    views: p.campaigns.reduce((sum, c) => sum + c._count.impressions, 0),
  }));
}

export type PlacementSlots = { code: string; name: string; used: number; max: number };

/** "Homepage carousel: 4 of 6 used" — same slot-occupying statuses as the capacity gate in admin-advertising.ts, so this can never disagree with what actually blocks a new campaign. */
export async function getPlacementFreeSlots(): Promise<PlacementSlots[]> {
  const placements = await db.adPlacement.findMany({
    where: { isActive: true },
    include: { campaigns: { where: { status: { in: [...SLOT_OCCUPYING_STATUSES] } }, select: { id: true } } },
    orderBy: { name: "asc" },
  });
  return placements.map((p) => ({ code: p.code, name: p.name, used: p.campaigns.length, max: p.maxConcurrentAds }));
}

export type SoonCampaign = { id: string; advertisementId: string; title: string; placementName: string; date: Date };

/** Campaigns whose window opens or closes within the next few days — a nudge to prep creative/payment follow-up or expect a slot to free up. */
export async function getCampaignsStartingSoon(windowDays = SOON_WINDOW_DAYS): Promise<SoonCampaign[]> {
  const now = new Date();
  const until = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const campaigns = await db.adCampaign.findMany({
    where: { status: "SCHEDULED", startDate: { gte: now, lte: until } },
    include: { advertisement: { select: { title: true } }, placement: { select: { name: true } } },
    orderBy: { startDate: "asc" },
  });
  return campaigns.map((c) => ({ id: c.id, advertisementId: c.advertisementId, title: c.advertisement.title, placementName: c.placement.name, date: c.startDate }));
}

export async function getCampaignsEndingSoon(windowDays = SOON_WINDOW_DAYS): Promise<SoonCampaign[]> {
  const now = new Date();
  const until = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const campaigns = await db.adCampaign.findMany({
    where: { status: "ACTIVE", endDate: { gte: now, lte: until } },
    include: { advertisement: { select: { title: true } }, placement: { select: { name: true } } },
    orderBy: { endDate: "asc" },
  });
  return campaigns.map((c) => ({ id: c.id, advertisementId: c.advertisementId, title: c.advertisement.title, placementName: c.placement.name, date: c.endDate }));
}
