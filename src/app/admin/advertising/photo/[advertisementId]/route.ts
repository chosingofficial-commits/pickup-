import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { respondWithAdPhoto } from "@/lib/ads/photo";

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
  return respondWithAdPhoto(advertisementId);
}
