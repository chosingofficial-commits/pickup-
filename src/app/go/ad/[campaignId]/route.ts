import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recordAdClick } from "@/lib/ads/queries";
import { publicEnv } from "@/lib/env/public";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const campaign = await db.adCampaign.findUnique({
    where: { id: campaignId },
    include: { advertisement: true },
  });

  if (!campaign || campaign.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", publicEnv.appUrl));
  }

  await recordAdClick(campaignId);

  const target = campaign.advertisement.targetUrl;
  const safeTarget = target.startsWith("http://") || target.startsWith("https://") ? target : new URL(target, publicEnv.appUrl).toString();

  return NextResponse.redirect(safeTarget);
}
