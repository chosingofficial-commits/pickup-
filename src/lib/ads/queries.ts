import "server-only";
import { db } from "@/lib/db";
import type { AdPlacementCode } from "@/generated/prisma/client";

export async function getActiveCampaignForPlacement(code: AdPlacementCode) {
  const now = new Date();
  return db.adCampaign.findFirst({
    where: {
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
      placement: { code, isActive: true },
    },
    include: { advertisement: { include: { advertiser: true } }, placement: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function recordAdImpression(campaignId: string) {
  await db.adImpression.create({ data: { campaignId } });
}

export async function recordAdClick(campaignId: string) {
  await db.adClick.create({ data: { campaignId } });
}
