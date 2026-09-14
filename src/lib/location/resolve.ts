import "server-only";
import { db } from "@/lib/db";
import { isPointInPolygon, haversineDistanceKm, type LatLng } from "./geo";

export type LocationResolution =
  | {
      isCovered: true;
      deliveryZoneId: string;
      deliveryZoneName: string;
      serviceAreaId: string;
      serviceAreaName: string;
      neighbourhoodId: string | null;
      deliveryFee: string;
      estimatedMinutesMin: number;
      estimatedMinutesMax: number;
    }
  | { isCovered: false };

const NEAREST_FALLBACK_MAX_KM = 4;

/**
 * Resolves an arbitrary point (or an explicitly chosen neighbourhood) to an
 * active delivery zone. Nothing here is hard-coded to Khagrachari Sadar —
 * it walks whatever active ServiceArea/DeliveryZone rows exist, so turning
 * on a new town is purely a data change.
 */
export async function resolveLocation(input: { lat?: number; lng?: number; neighbourhoodId?: string }): Promise<LocationResolution> {
  if (input.neighbourhoodId) {
    const zone = await db.deliveryZone.findFirst({
      where: {
        neighbourhoodId: input.neighbourhoodId,
        isActive: true,
        serviceArea: { isActive: true },
      },
      include: { serviceArea: true },
    });
    if (zone) return toResolution(zone);
  }

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    const point: LatLng = { lat: input.lat, lng: input.lng };

    const zones = await db.deliveryZone.findMany({
      where: { isActive: true, serviceArea: { isActive: true } },
      include: { serviceArea: true, boundary: { orderBy: { sequence: "asc" } }, neighbourhood: true },
    });

    for (const zone of zones) {
      if (zone.boundary.length >= 3) {
        const polygon = zone.boundary.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
        if (isPointInPolygon(point, polygon)) return toResolution(zone);
      }
    }

    // Fall back to nearest neighbourhood centre within a short radius, for
    // zones that don't yet have a hand-drawn boundary.
    let nearest: { zone: (typeof zones)[number]; distanceKm: number } | null = null;
    for (const zone of zones) {
      const centerLat = zone.neighbourhood?.centerLat;
      const centerLng = zone.neighbourhood?.centerLng;
      if (centerLat == null || centerLng == null) continue;
      const distanceKm = haversineDistanceKm(point, { lat: Number(centerLat), lng: Number(centerLng) });
      if (distanceKm <= NEAREST_FALLBACK_MAX_KM && (!nearest || distanceKm < nearest.distanceKm)) {
        nearest = { zone, distanceKm };
      }
    }
    if (nearest) return toResolution(nearest.zone);
  }

  return { isCovered: false };
}

function toResolution(zone: {
  id: string;
  name: string;
  serviceAreaId: string;
  serviceArea: { name: string };
  neighbourhoodId: string | null;
  deliveryFee: unknown;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
}): LocationResolution {
  return {
    isCovered: true,
    deliveryZoneId: zone.id,
    deliveryZoneName: zone.name,
    serviceAreaId: zone.serviceAreaId,
    serviceAreaName: zone.serviceArea.name,
    neighbourhoodId: zone.neighbourhoodId,
    deliveryFee: String(zone.deliveryFee),
    estimatedMinutesMin: zone.estimatedMinutesMin,
    estimatedMinutesMax: zone.estimatedMinutesMax,
  };
}
