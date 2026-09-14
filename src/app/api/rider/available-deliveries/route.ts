import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAvailableAssignments, isRiderCurrentlyBusy } from "@/lib/rider/queries";
import { haversineDistanceKm } from "@/lib/location/geo";
import { db } from "@/lib/db";

/**
 * Polled by the rider dashboard's incoming-delivery alert — only meaningful
 * while the rider is online. A rider already mid-delivery gets nothing here
 * (they shouldn't be pulled onto a second job before finishing the first),
 * and free riders see deliveries ordered nearest-pickup-first using their
 * last known position, so the closest rider to a store is the one most
 * likely to see and grab it first.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "RIDER" || !user.riderProfile?.isApproved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (await isRiderCurrentlyBusy(user.riderProfile.id)) {
    return NextResponse.json([]);
  }

  const [assignments, riderProfile] = await Promise.all([
    getAvailableAssignments(),
    db.riderProfile.findUnique({ where: { id: user.riderProfile.id }, select: { currentLat: true, currentLng: true } }),
  ]);

  const riderLat = riderProfile?.currentLat != null ? Number(riderProfile.currentLat) : null;
  const riderLng = riderProfile?.currentLng != null ? Number(riderProfile.currentLng) : null;

  const withDistance = assignments.map((o) => {
    const vendorLat = o.vendor.lat != null ? Number(o.vendor.lat) : null;
    const vendorLng = o.vendor.lng != null ? Number(o.vendor.lng) : null;
    const distanceKm =
      riderLat != null && riderLng != null && vendorLat != null && vendorLng != null
        ? haversineDistanceKm({ lat: riderLat, lng: riderLng }, { lat: vendorLat, lng: vendorLng })
        : null;
    return { order: o, distanceKm };
  });

  // Nearest-first for riders with a known position; unknown-distance ones sort to the end (oldest first among themselves).
  withDistance.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return NextResponse.json(
    withDistance.map(({ order: o, distanceKm }) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      vendorBusinessName: o.vendor.businessName,
      neighbourhoodName: o.address.neighbourhood?.name ?? "",
      itemCount: o.items.length,
      total: o.total.toString(),
      distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    })),
  );
}
