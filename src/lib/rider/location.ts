import "server-only";
import { db } from "@/lib/db";

const LOCATION_RETENTION_MS = 60 * 60 * 1000; // 1 hour — see cron job for periodic purge

export async function recordRiderLocation(riderId: string, deliveryId: string, lat: number, lng: number) {
  const expiresAt = new Date(Date.now() + LOCATION_RETENTION_MS);
  await db.$transaction([
    db.riderLocationUpdate.create({ data: { riderId, deliveryId, lat, lng, expiresAt } }),
    db.riderProfile.update({ where: { id: riderId }, data: { currentLat: lat, currentLng: lng, currentLocationAt: new Date() } }),
  ]);
}

export async function getLatestRiderLocation(deliveryId: string) {
  return db.riderLocationUpdate.findFirst({ where: { deliveryId }, orderBy: { recordedAt: "desc" } });
}

/** Deletes rider location pings past their retention window — run periodically via the cron endpoint. */
export async function purgeExpiredRiderLocations() {
  const result = await db.riderLocationUpdate.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}
