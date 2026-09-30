import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { respondWithAdPhoto } from "@/lib/ads/photo";

/**
 * Owner (or admin) view of an ad's photo, for the "My ads" page — same
 * private-bucket-or-public streaming as the admin route, gated by ownership
 * instead of by role. A pending image must never be reachable by anyone
 * else, so this checks the advertisement's advertiser against the caller
 * before ever touching storage.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ advertisementId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { advertisementId } = await params;
  const ad = await db.advertisement.findUnique({
    where: { id: advertisementId },
    select: { advertiser: { select: { userId: true } } },
  });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && ad.advertiser.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return respondWithAdPhoto(advertisementId);
}
