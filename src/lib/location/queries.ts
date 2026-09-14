import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

// These two are identical for every visitor and rarely change (an admin
// activating a service area or delivery zone), so they're cached across
// requests for a few minutes rather than re-queried on every single page
// load — they're read from the shared Header on every storefront page.
const CACHE_REVALIDATE_SECONDS = 300;

export const getActiveServiceAreas = unstable_cache(
  async () => {
    return db.serviceArea.findMany({
      where: { isActive: true },
      include: { town: { include: { upazila: { include: { district: { include: { division: true } } } } } } },
      orderBy: { launchedAt: "asc" },
    });
  },
  ["active-service-areas"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["locations"] },
);

/** Human label for "Now delivering in {area}" — joins whatever is active, without assuming a fixed place. */
export async function getActiveServiceAreaLabel(): Promise<string | null> {
  const areas = await getActiveServiceAreas();
  if (areas.length === 0) return null;
  return areas.map((a) => a.name).join(", ");
}

export const getOrderableNeighbourhoods = unstable_cache(
  async () => {
    return db.neighbourhood.findMany({
      where: {
        deliveryZones: { some: { isActive: true, serviceArea: { isActive: true } } },
      },
      include: { town: true },
      orderBy: { name: "asc" },
    });
  },
  ["orderable-neighbourhoods"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["locations"] },
);

export const listDivisions = cache(async () => {
  return db.division.findMany({ orderBy: { name: "asc" } });
});

export const listDistrictsByDivision = cache(async (divisionId: string) => {
  return db.district.findMany({ where: { divisionId }, orderBy: { name: "asc" } });
});

export const listUpazilasByDistrict = cache(async (districtId: string) => {
  return db.upazila.findMany({ where: { districtId }, orderBy: { name: "asc" } });
});
