"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveLocation } from "@/lib/location/resolve";
import { setSelectedLocationCookie } from "@/lib/location/cookie";
import { coverageRequestSchema } from "@/lib/validation/location";
import { coverageRequestRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

export async function selectLocationByNeighbourhoodAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const neighbourhoodId = String(formData.get("neighbourhoodId") ?? "");
  const label = String(formData.get("label") ?? "");
  if (!neighbourhoodId) return { status: "error", message: "Choose an area from the list." };

  const resolution = await resolveLocation({ neighbourhoodId });

  if (resolution.isCovered) {
    await setSelectedLocationCookie({
      label,
      isCovered: true,
      deliveryZoneId: resolution.deliveryZoneId,
      serviceAreaId: resolution.serviceAreaId,
      neighbourhoodId,
      deliveryFee: resolution.deliveryFee,
      etaMin: resolution.estimatedMinutesMin,
      etaMax: resolution.estimatedMinutesMax,
    });
  } else {
    await setSelectedLocationCookie({ label, isCovered: false, neighbourhoodId });
  }

  revalidatePath("/");
  return { status: "success", isCovered: resolution.isCovered };
}

export async function selectLocationByCoordsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const label = String(formData.get("label") ?? "Selected location");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: "error", message: "Could not read that location. Try entering your address instead." };
  }

  const resolution = await resolveLocation({ lat, lng });

  if (resolution.isCovered) {
    await setSelectedLocationCookie({
      label,
      lat,
      lng,
      isCovered: true,
      deliveryZoneId: resolution.deliveryZoneId,
      serviceAreaId: resolution.serviceAreaId,
      neighbourhoodId: resolution.neighbourhoodId ?? undefined,
      deliveryFee: resolution.deliveryFee,
      etaMin: resolution.estimatedMinutesMin,
      etaMax: resolution.estimatedMinutesMax,
    });
  } else {
    await setSelectedLocationCookie({ label, lat, lng, isCovered: false });
  }

  revalidatePath("/");
  return { status: "success", isCovered: resolution.isCovered };
}

export async function submitCoverageRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const allowed = await coverageRequestRateLimiter.consume(ip);
  if (!allowed) {
    return { status: "error", message: "Too many requests. Please try again later." };
  }

  const parsed = coverageRequestSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    addressText: formData.get("addressText"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    divisionText: formData.get("divisionText"),
    districtText: formData.get("districtText"),
    upazilaText: formData.get("upazilaText"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value;
    }
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const user = await getCurrentUser();

  await db.coverageRequest.create({
    data: {
      userId: user?.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      addressText: parsed.data.addressText,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      divisionText: parsed.data.divisionText,
      districtText: parsed.data.districtText,
      upazilaText: parsed.data.upazilaText,
    },
  });

  return { status: "success", message: "Thanks! We've noted your area and will notify you when Pick Up launches there." };
}
