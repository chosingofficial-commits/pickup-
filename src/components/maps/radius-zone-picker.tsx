"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Ruler, Info } from "lucide-react";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { Input, Label } from "@/components/ui/input";

/**
 * Lat/lng/radius inputs with a live circle preview. With a Google Maps key
 * configured, the circle is a real editable overlay (drag the marker, drag
 * the circle edge to resize) kept in sync with the number inputs below it.
 * Without a key, falls back to an abstract not-to-scale circle sized from
 * the radius value — same honesty rule as SimulatedMap.
 */
export function RadiusZonePicker({
  latName,
  lngName,
  radiusName,
  defaultLat,
  defaultLng,
  defaultRadiusMeters = 100,
}: {
  latName: string;
  lngName: string;
  radiusName: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultRadiusMeters?: number;
}) {
  const [lat, setLat] = useState<number | "">(defaultLat ?? "");
  const [lng, setLng] = useState<number | "">(defaultLng ?? "");
  const [radiusMeters, setRadiusMeters] = useState(defaultRadiusMeters);
  const [mapsReady, setMapsReady] = useState<boolean | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

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
    if (!mapsReady || !containerRef.current || mapRef.current) return;

    const center = { lat: typeof lat === "number" ? lat : 23.6197, lng: typeof lng === "number" ? lng : 91.9847 };

    const map = new google.maps.Map(containerRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
    });
    const marker = new google.maps.Marker({ position: center, map, draggable: true });
    const circle = new google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      editable: true,
      draggable: false,
      fillColor: "#66BB6A",
      fillOpacity: 0.18,
      strokeColor: "#1B5E20",
      strokeWeight: 2,
    });

    marker.addListener("drag", () => {
      const pos = marker.getPosition();
      if (!pos) return;
      circle.setCenter(pos);
      setLat(Number(pos.lat().toFixed(6)));
      setLng(Number(pos.lng().toFixed(6)));
    });
    circle.addListener("center_changed", () => {
      const c = circle.getCenter();
      if (!c) return;
      marker.setPosition(c);
      setLat(Number(c.lat().toFixed(6)));
      setLng(Number(c.lng().toFixed(6)));
    });
    circle.addListener("radius_changed", () => {
      setRadiusMeters(Math.round(circle.getRadius()));
    });

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
    // Initialize once — subsequent typed edits are synced by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  // Typed radius -> map circle
  useEffect(() => {
    if (circleRef.current && Math.round(circleRef.current.getRadius()) !== radiusMeters) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Typed lat/lng -> map marker + circle
  useEffect(() => {
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const pos = { lat, lng };
    if (markerRef.current) markerRef.current.setPosition(pos);
    if (circleRef.current) circleRef.current.setCenter(pos);
  }, [lat, lng]);

  const previewPx = Math.min(220, Math.max(28, radiusMeters / 6));

  return (
    <div className="space-y-3 sm:col-span-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={latName}>Latitude</Label>
          <Input
            id={latName}
            name={latName}
            type="number"
            step="0.000001"
            required
            value={lat}
            onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor={lngName}>Longitude</Label>
          <Input
            id={lngName}
            name={lngName}
            type="number"
            step="0.000001"
            required
            value={lng}
            onChange={(e) => setLng(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor={radiusName}>Radius (meters)</Label>
          <Input
            id={radiusName}
            name={radiusName}
            type="number"
            min="10"
            required
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Math.max(10, Number(e.target.value) || 10))}
          />
        </div>
      </div>

      {mapsReady ? (
        <div ref={containerRef} className="h-64 w-full rounded-card border border-border-brand" role="img" aria-label="Zone radius map" />
      ) : (
        <div className="rounded-card border border-dashed border-border-brand bg-surface-muted p-5">
          <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5" aria-hidden />
            Simulated preview — connect Google Maps for a draggable map
          </div>
          <div className="flex h-56 items-center justify-center">
            <div
              className="relative flex items-center justify-center rounded-full border-2 border-brand-primary bg-brand-primary/15 transition-all"
              style={{ width: previewPx * 2, height: previewPx * 2 }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark text-white shadow-soft">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-600">
            <Ruler className="h-3.5 w-3.5" aria-hidden />
            {radiusMeters} m radius — circle size for reference only, not to scale
          </p>
        </div>
      )}
    </div>
  );
}
