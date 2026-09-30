import "server-only";
import { db } from "@/lib/db";
import { rotateByHour } from "./availability";
import { syncAdCampaignLifecycleThrottled } from "./lifecycle";
import type { AdPlacementCode } from "@/generated/prisma/client";

/**
 * All currently-active campaigns for a placement, for the carousel —
 * fetched oldest-first (a stable base order), then rotated so every
 * campaign gets an equal share of the first slot over time instead of
 * whichever was created earliest always leading. Same result feeds both
 * the mobile and desktop carousel, so they're always in sync.
 */
export async function getActiveCampaignsForPlacement(code: AdPlacementCode) {
  const now = new Date();
  // A SCHEDULED campaign whose start date just arrived needs to flip to
  // ACTIVE before this query below (which only selects ACTIVE) will ever
  // pick it up — there's no cron in this deployment, so this is the catch-up.
  // Throttled to once a minute since this runs on every homepage/marketplace
  // render — a minute of lag before a scheduled ad appears is unnoticeable.
  await syncAdCampaignLifecycleThrottled(now);
  const campaigns = await db.adCampaign.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
      placement: { code, isActive: true },
    },
    include: { advertisement: { include: { advertiser: true } }, placement: true },
    orderBy: { createdAt: "asc" },
  });
  return rotateByHour(campaigns, now);
}

/** One INSERT for every campaign shown in a single page render, instead of one per campaign. */
export async function recordAdImpressions(campaignIds: string[]) {
  if (campaignIds.length === 0) return;
  await db.adImpression.createMany({ data: campaignIds.map((campaignId) => ({ campaignId })) });
}

export async function recordAdClick(campaignId: string) {
  await db.adClick.create({ data: { campaignId } });
}
