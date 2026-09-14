"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { SimulatedMap } from "./simulated-map";
import { haversineDistanceKm } from "@/lib/location/geo";

export type DeliveryMapPoint = { lat: number; lng: number; label: string };

export function DeliveryMap({
  pickup,
  drop,
  rider,
  etaMinutes,
}: {
  pickup: DeliveryMapPoint;
  drop: DeliveryMapPoint;
  rider?: { lat: number; lng: number } | null;
  etaMinutes?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapsReady, setMapsReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((ok) => {
      if (!cancelled) setMapsReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: rider ?? pickup,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
    }
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    const addMarker = (point: { lat: number; lng: number }, label: string, color: string) => {
      const marker = new google.maps.Marker({
        position: point,
        map,
        title: label,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      });
      markersRef.current.push(marker);
      bounds.extend(point);
    };

    addMarker(pickup, pickup.label, "#1b5e20");
    addMarker(drop, drop.label, "#66bb6a");
    if (rider) addMarker(rider, "Rider", "#e53935");

    map.fitBounds(bounds, 60);
  }, [mapsReady, pickup, drop, rider]);

  if (mapsReady === null) {
    return <div className="flex h-64 items-center justify-center rounded-card border border-border-brand bg-surface-muted text-sm text-gray-500">Loading map…</div>;
  }

  if (!mapsReady) {
    const distanceKm = rider ? haversineDistanceKm(rider, drop) : haversineDistanceKm(pickup, drop);
    const progressPct = rider ? Math.max(5, 100 - (distanceKm / haversineDistanceKm(pickup, drop)) * 100) : 5;
    return <SimulatedMap pickupLabel={pickup.label} dropLabel={drop.label} progressPct={progressPct} etaMinutes={etaMinutes} distanceKm={distanceKm} />;
  }

  return <div ref={containerRef} className="h-64 w-full rounded-card border border-border-brand" role="img" aria-label="Delivery map" />;
}
