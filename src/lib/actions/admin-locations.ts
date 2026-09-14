"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { circlePolygon } from "@/lib/location/geo";
import type { ActionState } from "./types";

async function uniqueSlug(check: (slug: string) => Promise<boolean>, base: string) {
  let slug = slugify(base);
  let n = 1;
  while (await check(slug)) slug = `${slugify(base)}-${++n}`;
  return slug;
}

export async function createDivisionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "error", message: "Enter a division name." };

  const slug = await uniqueSlug((s) => db.division.findUnique({ where: { slug: s } }).then(Boolean), name);
  await db.division.create({ data: { name, slug } });
  await recordAuditLog({ actorUserId: admin.id, action: "DIVISION_CREATED", entityType: "Division", metadata: { name } });
  revalidatePath("/admin/locations");
  return { status: "success", message: "Division added." };
}

export async function createDistrictAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const divisionId = String(formData.get("divisionId") ?? "");
  if (!name || !divisionId) return { status: "error", message: "Choose a division and enter a district name." };

  const slug = await uniqueSlug((s) => db.district.findFirst({ where: { divisionId, slug: s } }).then(Boolean), name);
  await db.district.create({ data: { name, slug, divisionId } });
  await recordAuditLog({ actorUserId: admin.id, action: "DISTRICT_CREATED", entityType: "District", metadata: { name } });
  revalidatePath("/admin/locations");
  return { status: "success", message: "District added." };
}

export async function createUpazilaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const districtId = String(formData.get("districtId") ?? "");
  if (!name || !districtId) return { status: "error", message: "Choose a district and enter an upazila name." };

  const slug = await uniqueSlug((s) => db.upazila.findFirst({ where: { districtId, slug: s } }).then(Boolean), name);
  await db.upazila.create({ data: { name, slug, districtId } });
  await recordAuditLog({ actorUserId: admin.id, action: "UPAZILA_CREATED", entityType: "Upazila", metadata: { name } });
  revalidatePath("/admin/locations");
  return { status: "success", message: "Upazila added." };
}

const townSchema = z.object({
  name: z.string().trim().min(2, "Enter a town name"),
  upazilaId: z.string().min(1, "Choose an upazila"),
  activateNow: z.coerce.boolean().default(false),
});

export async function createTownAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = townSchema.safeParse({
    name: formData.get("name"),
    upazilaId: formData.get("upazilaId"),
    activateNow: formData.get("activateNow") === "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = await uniqueSlug((s) => db.town.findFirst({ where: { upazilaId: parsed.data.upazilaId, slug: s } }).then(Boolean), parsed.data.name);

  const town = await db.town.create({ data: { name: parsed.data.name, slug, upazilaId: parsed.data.upazilaId } });
  const serviceArea = await db.serviceArea.create({
    data: { townId: town.id, name: parsed.data.name, isActive: parsed.data.activateNow, launchedAt: parsed.data.activateNow ? new Date() : null },
  });

  await recordAuditLog({ actorUserId: admin.id, action: "TOWN_CREATED", entityType: "Town", entityId: town.id, metadata: { name: parsed.data.name } });
  revalidatePath("/admin/locations");
  return { status: "success", message: `${parsed.data.name} added as a new service area${parsed.data.activateNow ? " and activated" : ""}. Service area ID: ${serviceArea.id}` };
}

export async function toggleServiceAreaActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const serviceAreaId = String(formData.get("serviceAreaId") ?? "");
  const area = await db.serviceArea.findUnique({ where: { id: serviceAreaId } });
  if (!area) return;

  const nextActive = !area.isActive;
  await db.serviceArea.update({
    where: { id: serviceAreaId },
    data: { isActive: nextActive, launchedAt: nextActive && !area.launchedAt ? new Date() : area.launchedAt },
  });
  await recordAuditLog({ actorUserId: admin.id, action: nextActive ? "SERVICE_AREA_ACTIVATED" : "SERVICE_AREA_DEACTIVATED", entityType: "ServiceArea", entityId: serviceAreaId });
  revalidatePath("/admin/locations");
}

const neighbourhoodSchema = z.object({
  name: z.string().trim().min(2, "Enter a neighbourhood name"),
  townId: z.string().min(1),
  centerLat: z.coerce.number().optional(),
  centerLng: z.coerce.number().optional(),
  deliveryFee: z.coerce.number().min(0, "Enter a delivery fee"),
  estimatedMinutesMin: z.coerce.number().int().min(1),
  estimatedMinutesMax: z.coerce.number().int().min(1),
});

export async function createNeighbourhoodWithZoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = neighbourhoodSchema.safeParse({
    name: formData.get("name"),
    townId: formData.get("townId"),
    centerLat: formData.get("centerLat") || undefined,
    centerLng: formData.get("centerLng") || undefined,
    deliveryFee: formData.get("deliveryFee"),
    estimatedMinutesMin: formData.get("estimatedMinutesMin"),
    estimatedMinutesMax: formData.get("estimatedMinutesMax"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const serviceArea = await db.serviceArea.findFirst({ where: { townId: parsed.data.townId } });
  if (!serviceArea) return { status: "error", message: "This town has no service area yet." };

  const slug = await uniqueSlug((s) => db.neighbourhood.findFirst({ where: { townId: parsed.data.townId, slug: s } }).then(Boolean), parsed.data.name);

  const neighbourhood = await db.neighbourhood.create({
    data: { name: parsed.data.name, slug, townId: parsed.data.townId, centerLat: parsed.data.centerLat, centerLng: parsed.data.centerLng },
  });

  await db.deliveryZone.create({
    data: {
      serviceAreaId: serviceArea.id,
      neighbourhoodId: neighbourhood.id,
      name: parsed.data.name,
      isActive: true,
      deliveryFee: parsed.data.deliveryFee,
      estimatedMinutesMin: parsed.data.estimatedMinutesMin,
      estimatedMinutesMax: parsed.data.estimatedMinutesMax,
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: "NEIGHBOURHOOD_CREATED", entityType: "Neighbourhood", entityId: neighbourhood.id });
  revalidatePath("/admin/locations");
  return { status: "success", message: `${parsed.data.name} added with its delivery zone.` };
}

const deliveryZoneByRadiusSchema = z.object({
  name: z.string().trim().min(2, "Enter a zone name"),
  townId: z.string().min(1, "Choose a town"),
  centerLat: z.coerce.number(),
  centerLng: z.coerce.number(),
  radiusMeters: z.coerce.number().int().min(50, "Radius must be at least 50m"),
  deliveryFee: z.coerce.number().min(0, "Enter a delivery fee"),
  estimatedMinutesMin: z.coerce.number().int().min(1),
  estimatedMinutesMax: z.coerce.number().int().min(1),
});

/**
 * Creates a delivery zone whose boundary is a circle (approximated as a
 * 32-point polygon) around a center — for coverage areas defined by a
 * simple radius rather than a hand-drawn neighbourhood boundary. Not tied
 * to a Neighbourhood row, since the area may not map to one.
 */
export async function createDeliveryZoneByRadiusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = deliveryZoneByRadiusSchema.safeParse({
    name: formData.get("name"),
    townId: formData.get("townId"),
    centerLat: formData.get("centerLat"),
    centerLng: formData.get("centerLng"),
    radiusMeters: formData.get("radiusMeters"),
    deliveryFee: formData.get("deliveryFee"),
    estimatedMinutesMin: formData.get("estimatedMinutesMin"),
    estimatedMinutesMax: formData.get("estimatedMinutesMax"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const serviceArea = await db.serviceArea.findFirst({ where: { townId: parsed.data.townId } });
  if (!serviceArea) return { status: "error", message: "This town has no service area yet." };

  const boundary = circlePolygon({ lat: parsed.data.centerLat, lng: parsed.data.centerLng }, parsed.data.radiusMeters);

  const zone = await db.deliveryZone.create({
    data: {
      serviceAreaId: serviceArea.id,
      name: parsed.data.name,
      isActive: true,
      deliveryFee: parsed.data.deliveryFee,
      estimatedMinutesMin: parsed.data.estimatedMinutesMin,
      estimatedMinutesMax: parsed.data.estimatedMinutesMax,
      boundary: { create: boundary.map((p, sequence) => ({ sequence, lat: p.lat, lng: p.lng })) },
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "DELIVERY_ZONE_CREATED_BY_RADIUS",
    entityType: "DeliveryZone",
    entityId: zone.id,
    metadata: { radiusMeters: parsed.data.radiusMeters, centerLat: parsed.data.centerLat, centerLng: parsed.data.centerLng },
  });
  revalidatePath("/admin/locations");
  return { status: "success", message: `${parsed.data.name} added — ${parsed.data.radiusMeters}m radius zone is live.` };
}

export async function updateDeliveryZoneAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const zoneId = String(formData.get("zoneId") ?? "");
  const deliveryFee = Number(formData.get("deliveryFee"));
  const estimatedMinutesMin = Number(formData.get("estimatedMinutesMin"));
  const estimatedMinutesMax = Number(formData.get("estimatedMinutesMax"));
  if (!zoneId || !Number.isFinite(deliveryFee)) return;

  await db.deliveryZone.update({ where: { id: zoneId }, data: { deliveryFee, estimatedMinutesMin, estimatedMinutesMax } });
  await recordAuditLog({ actorUserId: admin.id, action: "DELIVERY_ZONE_UPDATED", entityType: "DeliveryZone", entityId: zoneId });
  revalidatePath("/admin/locations");
}

export async function toggleDeliveryZoneActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const zoneId = String(formData.get("zoneId") ?? "");
  const zone = await db.deliveryZone.findUnique({ where: { id: zoneId } });
  if (!zone) return;

  await db.deliveryZone.update({ where: { id: zoneId }, data: { isActive: !zone.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: zone.isActive ? "DELIVERY_ZONE_DISABLED" : "DELIVERY_ZONE_ENABLED", entityType: "DeliveryZone", entityId: zoneId });
  revalidatePath("/admin/locations");
}

const exclusionZoneSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  category: z.enum(["SCHOOL", "HOSPITAL", "CLINIC", "CHILDRENS_PARK", "PLAYGROUND", "SPORTS_VENUE", "OTHER"]),
  centerLat: z.coerce.number(),
  centerLng: z.coerce.number(),
  radiusMeters: z.coerce.number().int().min(10).default(100),
});

export async function createExclusionZoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = exclusionZoneSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    centerLat: formData.get("centerLat"),
    centerLng: formData.get("centerLng"),
    radiusMeters: formData.get("radiusMeters"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.geographicExclusionZone.create({ data: parsed.data });
  await recordAuditLog({ actorUserId: admin.id, action: "EXCLUSION_ZONE_CREATED", entityType: "GeographicExclusionZone", metadata: { name: parsed.data.name } });
  revalidatePath("/admin/locations");
  return { status: "success", message: "Exclusion zone added." };
}

export async function toggleExclusionZoneActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const zoneId = String(formData.get("zoneId") ?? "");
  const zone = await db.geographicExclusionZone.findUnique({ where: { id: zoneId } });
  if (!zone) return;
  await db.geographicExclusionZone.update({ where: { id: zoneId }, data: { isActive: !zone.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: zone.isActive ? "EXCLUSION_ZONE_DISABLED" : "EXCLUSION_ZONE_ENABLED", entityType: "GeographicExclusionZone", entityId: zoneId });
  revalidatePath("/admin/locations");
}
