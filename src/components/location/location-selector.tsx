"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MapPin, LocateFixed, X, Search } from "lucide-react";
import { selectLocationByCoordsAction, selectLocationByNeighbourhoodAction } from "@/lib/actions/location";
import { initialActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { CoverageRequestForm } from "./coverage-request-form";
import { useLocale } from "@/components/providers/locale-provider";
import type { SelectedLocation } from "@/lib/location/cookie";

export type NeighbourhoodOption = { id: string; name: string; townName: string };

export function LocationSelector({
  neighbourhoods,
  initialSelection,
}: {
  neighbourhoods: NeighbourhoodOption[];
  initialSelection: SelectedLocation | null;
}) {
  const { dict } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<"neighbourhood" | "coords" | null>(null);

  const neighbourhoodFormRef = useRef<HTMLFormElement>(null);
  const neighbourhoodIdRef = useRef<HTMLInputElement>(null);
  const neighbourhoodLabelRef = useRef<HTMLInputElement>(null);
  const [neighbourhoodState, neighbourhoodAction, neighbourhoodPending] = useActionState(
    selectLocationByNeighbourhoodAction,
    initialActionState,
  );

  const coordsFormRef = useRef<HTMLFormElement>(null);
  const coordsLatRef = useRef<HTMLInputElement>(null);
  const coordsLngRef = useRef<HTMLInputElement>(null);
  const [coordsState, coordsAction, coordsPending] = useActionState(selectLocationByCoordsAction, initialActionState);

  const activeResult = activeMethod === "neighbourhood" ? neighbourhoodState : activeMethod === "coords" ? coordsState : null;
  const isPending = neighbourhoodPending || coordsPending;

  useEffect(() => {
    if (activeResult?.status === "success" && activeResult.isCovered) {
      const t = setTimeout(() => dialogRef.current?.close(), 900);
      return () => clearTimeout(t);
    }
  }, [activeResult?.status, activeResult?.isCovered]);

  const filtered = neighbourhoods.filter((n) => n.name.toLowerCase().includes(query.toLowerCase()));

  function pickNeighbourhood(n: NeighbourhoodOption) {
    setActiveMethod("neighbourhood");
    if (neighbourhoodIdRef.current) neighbourhoodIdRef.current.value = n.id;
    if (neighbourhoodLabelRef.current) neighbourhoodLabelRef.current.value = `${n.name}, ${n.townName}`;
    neighbourhoodFormRef.current?.requestSubmit();
  }

  function useCurrentLocation() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser does not support location detection. Please enter your address instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setActiveMethod("coords");
        if (coordsLatRef.current) coordsLatRef.current.value = String(pos.coords.latitude);
        if (coordsLngRef.current) coordsLngRef.current.value = String(pos.coords.longitude);
        coordsFormRef.current?.requestSubmit();
      },
      () => setGeoError(dict.location.permissionDenied),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex min-h-11 max-w-[130px] items-center gap-1.5 rounded-control border border-border-brand bg-white px-2.5 py-2 text-left text-sm font-medium text-brand-dark hover:bg-brand-bg md:min-h-0 md:max-w-[220px] md:px-3 lg:max-w-[280px]"
      >
        <MapPin className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden />
        {/* Mobile: the area name only (e.g. "Khagrachari Sadar" from "Khagrachari Sadar, Khagrachari"), or a short "Set location" when nothing's selected yet — both fit on one line at 360px without truncating. Desktop keeps the full label unchanged. */}
        <span className="truncate md:hidden">
          {initialSelection ? initialSelection.label.split(",")[0] : dict.location.setLocationShort}
        </span>
        <span className="hidden truncate md:inline">
          {initialSelection?.label ?? dict.location.selectLocation}
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={dict.location.selectLocation}
        className="w-full max-w-md rounded-card border border-border-brand p-0 shadow-lifted backdrop:bg-black/40 open:animate-in"
      >
        <div className="flex items-center justify-between border-b border-border-brand p-4">
          <h2 className="font-heading text-lg font-bold text-brand-dark">{dict.location.selectLocation}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-500 hover:bg-brand-bg"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4">
          {activeResult?.status === "success" && activeResult.isCovered && (
            <p role="status" className="mb-3 rounded-control bg-brand-bg px-3.5 py-2.5 text-sm text-brand-dark">
              Delivering here — this area is inside our active zone.
            </p>
          )}

          {activeResult?.status === "success" && activeResult.isCovered === false && (
            <div className="mb-4 space-y-3 rounded-control bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">{dict.location.notCovered}</p>
              <p className="text-sm text-amber-800">{dict.location.notCoveredBody}</p>
              <CoverageRequestForm />
            </div>
          )}

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={isPending}
            className="mb-2 flex w-full items-center gap-2 rounded-control border border-brand-primary bg-brand-bg px-3.5 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-accent/40 disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4 text-brand-primary" aria-hidden />
            {dict.location.useCurrentLocation}
          </button>
          <p className="mb-4 text-xs text-gray-500">{dict.location.permissionExplainer}</p>
          {geoError && (
            <p role="alert" className="mb-4 text-xs text-red-600">
              {geoError}
            </p>
          )}

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dict.location.searchAddress}
              aria-label={dict.location.enterAddressManually}
              className="pl-9"
            />
          </div>

          <ul className="space-y-1.5" role="list">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => pickNeighbourhood(n)}
                  disabled={isPending}
                  className="w-full rounded-control border border-border-brand px-3.5 py-2.5 text-left text-sm hover:bg-brand-bg disabled:opacity-60"
                >
                  <span className="font-medium text-brand-dark">{n.name}</span>
                  <span className="text-gray-500"> · {n.townName}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="rounded-control bg-surface-muted px-3.5 py-3 text-sm text-gray-500">
                No matching area. Your area may be outside our current coverage — use the form above once you try current
                location, or contact support.
              </li>
            )}
          </ul>
        </div>

        <form ref={neighbourhoodFormRef} action={neighbourhoodAction} className="hidden">
          <input ref={neighbourhoodIdRef} type="hidden" name="neighbourhoodId" />
          <input ref={neighbourhoodLabelRef} type="hidden" name="label" />
        </form>
        <form ref={coordsFormRef} action={coordsAction} className="hidden">
          <input ref={coordsLatRef} type="hidden" name="lat" />
          <input ref={coordsLngRef} type="hidden" name="lng" />
          <input type="hidden" name="label" value="Current location" />
        </form>
      </dialog>
    </>
  );
}
