"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { circlePolygon } from "@/lib/location/geo";
import { optionalText, optionalNumber } from "@/lib/validation/form-helpers";
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

const townSchema = z.object({
  name: z.string().trim().min(2, "Enter a town name"),
  districtId: z.string().min(1, "Choose a zila"),
  activateNow: z.coerce.boolean().default(false),
});

/**
 * Towns link straight to a District (zila) — the business only ever
 * operates by zila and town, never upazila (see PLAN-remove-upazila).
 * `Town.upazilaId` is left null for new rows; it's a deprecated column
 * being phased out in a later, separate migration.
 */
export async function createTownAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = townSchema.safeParse({
    name: formData.get("name"),
    districtId: formData.get("districtId"),
    activateNow: formData.get("activateNow") === "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = await uniqueSlug((s) => db.town.findFirst({ where: { districtId: parsed.data.districtId, slug: s } }).then(Boolean), parsed.data.name);

  const town = await db.town.create({ data: { name: parsed.data.name, slug, districtId: parsed.data.districtId } });
  const serviceArea = await db.serviceArea.create({
    data: { townId: town.id, name: parsed.data.name, isActive: parsed.data.activateNow, launchedAt: parsed.data.activateNow ? new Date() : null },
  });

  await recordAuditLog({ actorUserId: admin.id, action: "TOWN_CREATED", entityType: "Town", entityId: town.id, metadata: { name: parsed.data.name } });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
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
  revalidateTag("locations", "minutes");
}

export async function renameServiceAreaAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const serviceAreaId = String(formData.get("serviceAreaId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!serviceAreaId || name.length < 2) return;

  await db.serviceArea.update({ where: { id: serviceAreaId }, data: { name } });
  await recordAuditLog({ actorUserId: admin.id, action: "SERVICE_AREA_RENAMED", entityType: "ServiceArea", entityId: serviceAreaId, metadata: { name } });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
}

export async function renameTownAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const townId = String(formData.get("townId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!townId || name.length < 2) return;

  await db.town.update({ where: { id: townId }, data: { name } });
  await recordAuditLog({ actorUserId: admin.id, action: "TOWN_RENAMED", entityType: "Town", entityId: townId, metadata: { name } });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
}

/**
 * A service area (and its town) can only be permanently deleted when
 * nothing depends on it — no zones, no neighbourhoods under its town, no
 * sibling service areas sharing that town, and no addresses or orders
 * still pointing at any of that. Address/Order FKs to Neighbourhood and
 * DeliveryZone are ON DELETE SET NULL / RESTRICT respectively (see
 * prisma/migrations/00000000000000_init), so without this check a delete
 * could either silently null out a customer's saved address or hit a raw
 * DB constraint error instead of a clear message. Used both to decide
 * whether the page shows the Delete button and to re-validate inside the
 * action itself (never trust the client).
 */
export async function isServiceAreaDeletable(serviceAreaId: string): Promise<boolean> {
  const area = await db.serviceArea.findUnique({ where: { id: serviceAreaId } });
  if (!area) return false;

  const [zoneCount, neighbourhoodCount, otherServiceAreaCount, addressCount, orderCount] = await Promise.all([
    db.deliveryZone.count({ where: { serviceAreaId } }),
    db.neighbourhood.count({ where: { townId: area.townId } }),
    db.serviceArea.count({ where: { townId: area.townId, id: { not: serviceAreaId } } }),
    db.address.count({ where: { OR: [{ neighbourhood: { townId: area.townId } }, { deliveryZone: { serviceAreaId } }] } }),
    db.order.count({ where: { deliveryZone: { serviceAreaId } } }),
  ]);

  return zoneCount === 0 && neighbourhoodCount === 0 && otherServiceAreaCount === 0 && addressCount === 0 && orderCount === 0;
}

export async function deleteServiceAreaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const serviceAreaId = String(formData.get("serviceAreaId") ?? "");
  const area = await db.serviceArea.findUnique({ where: { id: serviceAreaId } });
  if (!area) return { status: "error", message: "Service area not found." };

  if (!(await isServiceAreaDeletable(serviceAreaId))) {
    return { status: "error", message: "This service area still has linked zones, addresses, or orders — use Deactivate instead." };
  }

  // Deleting the town cascades to the now-empty ServiceArea (and would
  // cascade to its Neighbourhoods/DeliveryZones too, but isServiceAreaDeletable
  // already confirmed there are none).
  await db.town.delete({ where: { id: area.townId } });
  await recordAuditLog({
    actorUserId: admin.id,
    action: "SERVICE_AREA_DELETED",
    entityType: "ServiceArea",
    entityId: serviceAreaId,
    metadata: { name: area.name, townId: area.townId },
  });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
  return { status: "success", message: `${area.name} and its town were deleted.` };
}

const zoneSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a zone name"),
    nameBn: optionalText(z.string().trim()),
    serviceAreaId: z.string().min(1),
    centerLat: optionalNumber(z.coerce.number()),
    centerLng: optionalNumber(z.coerce.number()),
    deliveryFee: z.coerce.number().min(0, "Enter a delivery fee of 0 or more"),
    estimatedMinutesMin: z.coerce.number().int().min(1),
    estimatedMinutesMax: z.coerce.number().int().min(1),
    activateNow: z.coerce.boolean().default(false),
  })
  .refine((d) => d.estimatedMinutesMin <= d.estimatedMinutesMax, {
    message: "Min delivery time can't be greater than the max.",
    path: ["estimatedMinutesMax"],
  });

/**
 * Creates a zone (a Neighbourhood + its paired DeliveryZone, kept in sync)
 * scoped to a single service area card — the customer-facing name lives on
 * the Neighbourhood, the pricing on the DeliveryZone, mirroring every
 * existing zone in this dataset.
 */
export async function createZoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = zoneSchema.safeParse({
    name: formData.get("name"),
    nameBn: formData.get("nameBn"),
    serviceAreaId: formData.get("serviceAreaId"),
    centerLat: formData.get("centerLat"),
    centerLng: formData.get("centerLng"),
    deliveryFee: formData.get("deliveryFee"),
    estimatedMinutesMin: formData.get("estimatedMinutesMin"),
    estimatedMinutesMax: formData.get("estimatedMinutesMax"),
    activateNow: formData.get("activateNow") === "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const serviceArea = await db.serviceArea.findUnique({ where: { id: parsed.data.serviceAreaId } });
  if (!serviceArea) return { status: "error", message: "Service area not found." };

  const duplicate = await db.deliveryZone.findFirst({
    where: { serviceAreaId: serviceArea.id, name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (duplicate) return { status: "error", message: `A zone named "${parsed.data.name}" already exists in this service area.` };

  const slug = await uniqueSlug((s) => db.neighbourhood.findFirst({ where: { townId: serviceArea.townId, slug: s } }).then(Boolean), parsed.data.name);

  const neighbourhood = await db.neighbourhood.create({
    data: {
      name: parsed.data.name,
      nameBn: parsed.data.nameBn || null,
      slug,
      townId: serviceArea.townId,
      centerLat: parsed.data.centerLat,
      centerLng: parsed.data.centerLng,
    },
  });

  await db.deliveryZone.create({
    data: {
      serviceAreaId: serviceArea.id,
      neighbourhoodId: neighbourhood.id,
      name: parsed.data.name,
      nameBn: parsed.data.nameBn || null,
      isActive: parsed.data.activateNow,
      deliveryFee: parsed.data.deliveryFee,
      estimatedMinutesMin: parsed.data.estimatedMinutesMin,
      estimatedMinutesMax: parsed.data.estimatedMinutesMax,
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "ZONE_CREATED",
    entityType: "Neighbourhood",
    entityId: neighbourhood.id,
    metadata: { name: parsed.data.name, serviceAreaId: serviceArea.id, activateNow: parsed.data.activateNow },
  });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
  return {
    status: "success",
    message: `${parsed.data.name} added${parsed.data.activateNow ? " and is live now." : " — enable it to make it orderable."}`,
  };
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
  revalidateTag("locations", "minutes");
  return { status: "success", message: `${parsed.data.name} added — ${parsed.data.radiusMeters}m radius zone is live.` };
}

const updateZoneSchema = z
  .object({
    zoneId: z.string().min(1),
    name: z.string().trim().min(2),
    nameBn: optionalText(z.string().trim()),
    deliveryFee: z.coerce.number().min(0),
    estimatedMinutesMin: z.coerce.number().int().min(1),
    estimatedMinutesMax: z.coerce.number().int().min(1),
  })
  .refine((d) => d.estimatedMinutesMin <= d.estimatedMinutesMax);

/**
 * Also renames the zone's paired Neighbourhood (if any) to match, since
 * that's the name customers actually see in the location picker — leaving
 * it out of sync would make a rename invisible to customers.
 */
export async function updateDeliveryZoneAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = updateZoneSchema.safeParse({
    zoneId: formData.get("zoneId"),
    name: formData.get("name"),
    nameBn: formData.get("nameBn"),
    deliveryFee: formData.get("deliveryFee"),
    estimatedMinutesMin: formData.get("estimatedMinutesMin"),
    estimatedMinutesMax: formData.get("estimatedMinutesMax"),
  });
  if (!parsed.success) return;

  const zone = await db.deliveryZone.findUnique({ where: { id: parsed.data.zoneId } });
  if (!zone) return;

  const duplicate = await db.deliveryZone.findFirst({
    where: { serviceAreaId: zone.serviceAreaId, name: { equals: parsed.data.name, mode: "insensitive" }, id: { not: zone.id } },
  });
  if (duplicate) return;

  await db.deliveryZone.update({
    where: { id: zone.id },
    data: {
      name: parsed.data.name,
      nameBn: parsed.data.nameBn || null,
      deliveryFee: parsed.data.deliveryFee,
      estimatedMinutesMin: parsed.data.estimatedMinutesMin,
      estimatedMinutesMax: parsed.data.estimatedMinutesMax,
    },
  });
  if (zone.neighbourhoodId) {
    await db.neighbourhood.update({ where: { id: zone.neighbourhoodId }, data: { name: parsed.data.name, nameBn: parsed.data.nameBn || null } });
  }
  await recordAuditLog({ actorUserId: admin.id, action: "DELIVERY_ZONE_UPDATED", entityType: "DeliveryZone", entityId: zone.id });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
}

export async function toggleDeliveryZoneActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const zoneId = String(formData.get("zoneId") ?? "");
  const zone = await db.deliveryZone.findUnique({ where: { id: zoneId } });
  if (!zone) return;

  await db.deliveryZone.update({ where: { id: zoneId }, data: { isActive: !zone.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: zone.isActive ? "DELIVERY_ZONE_DISABLED" : "DELIVERY_ZONE_ENABLED", entityType: "DeliveryZone", entityId: zoneId });
  revalidatePath("/admin/locations");
  revalidateTag("locations", "minutes");
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
