import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getActiveServiceAreas = cache(async () => {
  return db.serviceArea.findMany({
    where: { isActive: true },
    include: { town: { include: { upazila: { include: { district: { include: { division: true } } } } } } },
    orderBy: { launchedAt: "asc" },
  });
});

/** Human label for "Now delivering in {area}" — joins whatever is active, without assuming a fixed place. */
export async function getActiveServiceAreaLabel(): Promise<string | null> {
  const areas = await getActiveServiceAreas();
  if (areas.length === 0) return null;
  return areas.map((a) => a.name).join(", ");
}

export const getOrderableNeighbourhoods = cache(async () => {
  return db.neighbourhood.findMany({
    where: {
      deliveryZones: { some: { isActive: true, serviceArea: { isActive: true } } },
    },
    include: { town: true },
    orderBy: { name: "asc" },
  });
});

export const listDivisions = cache(async () => {
  return db.division.findMany({ orderBy: { name: "asc" } });
});

export const listDistrictsByDivision = cache(async (divisionId: string) => {
  return db.district.findMany({ where: { divisionId }, orderBy: { name: "asc" } });
});

export const listUpazilasByDistrict = cache(async (districtId: string) => {
  return db.upazila.findMany({ where: { districtId }, orderBy: { name: "asc" } });
});
