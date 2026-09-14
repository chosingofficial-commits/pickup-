import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

export const LOCATION_COOKIE_NAME = "pickup_location";

export type SelectedLocation = {
  label: string;
  lat?: number;
  lng?: number;
  isCovered: boolean;
  deliveryZoneId?: string;
  serviceAreaId?: string;
  neighbourhoodId?: string;
  deliveryFee?: string;
  etaMin?: number;
  etaMax?: number;
};

export const getSelectedLocation = cache(async (): Promise<SelectedLocation | null> => {
  const store = await cookies();
  const raw = store.get(LOCATION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedLocation;
  } catch {
    return null;
  }
});

export async function setSelectedLocationCookie(value: SelectedLocation) {
  const store = await cookies();
  store.set(LOCATION_COOKIE_NAME, JSON.stringify(value), {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
}
