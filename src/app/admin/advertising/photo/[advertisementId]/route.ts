import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/registry";

/**
 * Admin-only view of an ad's photo — works whether it's still sitting in
 * the private bucket (pending approval) or has already been copied to the
 * public one, so this is the one URL the admin UI ever needs for an ad
 * photo. Mirrors the vendor-document route's security headers.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ advertisementId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { advertisementId } = await params;
  const ad = await db.advertisement.findUnique({
    where: { id: advertisementId },
    select: { pendingBannerImageKey: true, bannerImageUrl: true },
  });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (ad.pendingBannerImageKey) {
    const adapter = getStorageAdapter();
    const object = await adapter.getObject(ad.pendingBannerImageKey, { private: true });
    if (!object) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return new NextResponse(new Uint8Array(object.body), {
      headers: {
        "Content-Type": object.contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "sandbox",
        "Content-Disposition": "inline",
      },
    });
  }

  if (ad.bannerImageUrl) return NextResponse.redirect(ad.bannerImageUrl);

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
