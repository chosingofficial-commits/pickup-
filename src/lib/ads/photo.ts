import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/registry";

/**
 * Streams a still-private pending image, or redirects to the public one once
 * approved — shared by the admin-only and owner-only photo routes so the
 * actual storage-fetching logic lives in exactly one place.
 */
export async function respondWithAdPhoto(advertisementId: string): Promise<NextResponse> {
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
