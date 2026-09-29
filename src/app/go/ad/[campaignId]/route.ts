import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recordAdClick } from "@/lib/ads/queries";
import { publicEnv } from "@/lib/env/public";

/**
 * The redirect target is validated at save time too (advertisementRequestSchema
 * requires http/https) — this is defense in depth for a row that somehow
 * ended up with something else (a future code path, direct DB edit, etc.),
 * so a click can never send anyone to a non-http(s) scheme like javascript:
 * or a custom app deep link.
 */
function isSafeHttpUrl(value: string): value is string {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const campaign = await db.adCampaign.findUnique({
    where: { id: campaignId },
    include: { advertisement: true },
  });

  if (!campaign || campaign.status !== "ACTIVE" || !isSafeHttpUrl(campaign.advertisement.targetUrl)) {
    return NextResponse.redirect(new URL("/", publicEnv.appUrl));
  }

  await recordAdClick(campaignId);

  return NextResponse.redirect(campaign.advertisement.targetUrl);
}
