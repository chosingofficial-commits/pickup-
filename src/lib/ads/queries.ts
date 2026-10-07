import "server-only";
import { db } from "@/lib/db";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { rotateByHour } from "./availability";
import { syncAdCampaignLifecycle, syncAdCampaignLifecycleThrottled } from "./lifecycle";
import type { PlacementOption } from "@/components/advertise/advertisement-request-form";
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

/**
 * Every ad an account has submitted, plus the site's ad-payment instructions
 * — the single data source behind "My ads" wherever it's shown (customer
 * account, vendor dashboard, rider dashboard). Always runs the unthrottled
 * lifecycle sync first, since this is read specifically to check current
 * status and should never show something stale.
 */
export async function getMyAdsData(userId: string) {
  await syncAdCampaignLifecycle();

  const [advertiser, settings] = await Promise.all([
    db.advertiser.findUnique({
      where: { userId },
      include: {
        advertisements: {
          orderBy: { createdAt: "desc" },
          include: {
            campaigns: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                placement: true,
                payments: { orderBy: { createdAt: "desc" }, take: 1 },
                _count: { select: { clicks: true } },
              },
            },
          },
        },
      },
    }),
    getSiteSettings(),
  ]);

  return {
    ads: advertiser?.advertisements ?? [],
    businessName: advertiser?.businessName ?? "",
    adPaymentInstructions: settings[SITE_SETTING_KEYS.adPaymentInstructions],
  };
}

export type MyAdsData = Awaited<ReturnType<typeof getMyAdsData>>;

export { myAdsHref } from "./my-ads-href";

/** Active placements with current pricing and booked date ranges, for the advertise form and its live pricing table — shared by /advertise and the vendor/rider dashboard "create a new ad" pages. */
export async function getActiveAdPlacementOptions(): Promise<PlacementOption[]> {
  const placements = await db.adPlacement.findMany({
    where: { isActive: true },
    include: {
      pricing: true,
      // SCHEDULED/ACTIVE/PAUSED campaigns still occupy a paid slot —
      // CANCELLED/EXPIRED don't (see checkPlacementCapacity, the same set
      // admin's capacity gate uses).
      campaigns: { where: { status: { in: ["SCHEDULED", "ACTIVE", "PAUSED"] } }, select: { startDate: true, endDate: true } },
    },
    orderBy: { name: "asc" },
  });

  return placements.map((p) => ({
    code: p.code,
    name: p.name,
    dailyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "DAILY")?.price ?? 0),
    weeklyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "WEEKLY")?.price ?? 0),
    monthlyPrice: Number(p.pricing.find((pr) => pr.billingCycle === "MONTHLY")?.price ?? 0),
    maxConcurrentAds: p.maxConcurrentAds,
    bookedRanges: p.campaigns.map((c) => ({ start: c.startDate.toISOString(), end: c.endDate.toISOString() })),
  }));
}
