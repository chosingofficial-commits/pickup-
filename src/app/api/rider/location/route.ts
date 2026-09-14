import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { recordRiderLocation } from "@/lib/rider/location";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "RIDER" || !user.riderProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const deliveryId = body?.deliveryId;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!deliveryId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.riderId !== user.riderProfile.id) {
    return NextResponse.json({ error: "Not your delivery" }, { status: 403 });
  }
  if (!delivery.isTrackingActive) {
    return NextResponse.json({ error: "Tracking is not active for this delivery" }, { status: 409 });
  }

  await recordRiderLocation(user.riderProfile.id, deliveryId, lat, lng);
  return NextResponse.json({ ok: true });
}
