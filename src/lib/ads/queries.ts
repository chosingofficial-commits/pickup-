import "server-only";
import { db } from "@/lib/db";
import type { AdPlacementCode } from "@/generated/prisma/client";

/** All currently-active campaigns for a placement, for the carousel — oldest first, so a longer-running campaign doesn't jump around as newer ones are approved. */
export async function getActiveCampaignsForPlacement(code: AdPlacementCode) {
  const now = new Date();
  return db.adCampaign.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
      placement: { code, isActive: true },
    },
    include: { advertisement: { include: { advertiser: true } }, placement: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function recordAdImpression(campaignId: string) {
  await db.adImpression.create({ data: { campaignId } });
}

export async function recordAdClick(campaignId: string) {
  await db.adClick.create({ data: { campaignId } });
}
