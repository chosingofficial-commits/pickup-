"use client";

import { publicEnv } from "@/lib/env/public";

let loadPromise: Promise<boolean> | null = null;

/**
 * Loads the Google Maps JavaScript API once and caches the promise.
 * Resolves to `false` (never rejects) when no key is configured, so
 * callers can fall back to the simulated map instead of throwing.
 */
export function loadGoogleMaps(): Promise<boolean> {
  if (!publicEnv.googleMapsApiKey) return Promise.resolve(false);
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${publicEnv.googleMapsApiKey}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return loadPromise;
}
