import { Store, MapPin, Bike, Info } from "lucide-react";

/**
 * Stand-in for the real map when Google Maps credentials aren't configured.
 * Deliberately abstract (not to scale) and clearly labeled — it must never
 * be mistaken for a real, geocoded map.
 */
export function SimulatedMap({
  pickupLabel,
  dropLabel,
  progressPct,
  etaMinutes,
  distanceKm,
}: {
  pickupLabel: string;
  dropLabel: string;
  progressPct: number;
  etaMinutes?: number | null;
  distanceKm?: number | null;
}) {
  const clamped = Math.min(100, Math.max(0, progressPct));

  return (
    <div className="rounded-card border border-dashed border-border-brand bg-surface-muted p-5">
      <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
        <Info className="h-3.5 w-3.5" aria-hidden />
        Simulated tracking — connect Google Maps for a live map
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex flex-col items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-white">
            <Store className="h-4 w-4" aria-hidden />
          </span>
          <span className="max-w-[80px] text-center text-[11px] text-gray-600">{pickupLabel}</span>
        </div>

        <div className="relative mx-2 h-1 flex-1 rounded-full bg-border-brand">
          <div className="h-1 rounded-full bg-brand-primary transition-all" style={{ width: `${clamped}%` }} />
          <span
            className="absolute -top-3 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-brand-primary text-white shadow-soft transition-all"
            style={{ left: `${clamped}%` }}
          >
            <Bike className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white">
            <MapPin className="h-4 w-4" aria-hidden />
          </span>
          <span className="max-w-[80px] text-center text-[11px] text-gray-600">{dropLabel}</span>
        </div>
      </div>

      {(etaMinutes != null || distanceKm != null) && (
        <p className="mt-4 text-center text-xs text-gray-600">
          {distanceKm != null && `${distanceKm.toFixed(1)} km`}
          {distanceKm != null && etaMinutes != null && " · "}
          {etaMinutes != null && `~${etaMinutes} min away`}
        </p>
      )}
    </div>
  );
}
