"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, AlertCircle } from "lucide-react";

const BROADCAST_INTERVAL_MS = 10_000;

/**
 * Shares the rider's live position for this delivery automatically — the
 * customer shouldn't depend on the rider remembering to tap a button.
 * Starts as soon as this mounts (i.e. as soon as the delivery is active);
 * the button only matters if the browser denies/needs a retry, or the
 * rider explicitly wants to pause.
 */
export function LocationBroadcaster({ deliveryId }: { deliveryId: string }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  function start() {
    if (!("geolocation" in navigator)) {
      setError("Location is not supported on this device.");
      return;
    }
    setError(null);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < BROADCAST_INTERVAL_MS) return;
        lastSentRef.current = now;
        fetch("/api/rider/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryId, lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => setError("Location permission was denied. Turn it on to share your live position with the customer."),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    watchIdRef.current = id;
    setSharing(true);
  }

  function stop() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setSharing(false);
  }

  useEffect(() => {
    // Deferred a tick so the initial start() (which sets state) runs outside
    // this effect's own commit, rather than synchronously within it.
    const timer = setTimeout(start, 0);
    return () => {
      clearTimeout(timer);
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // Auto-start once per mounted delivery — start()/stop() are stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  return (
    <div className="rounded-control border border-border-brand bg-white p-3">
      <button
        type="button"
        onClick={sharing ? stop : start}
        className={`flex items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold ${
          sharing ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark hover:bg-brand-bg"
        }`}
      >
        <Navigation className="h-4 w-4" aria-hidden />
        {sharing ? "Sharing live location…" : error ? "Retry sharing location" : "Share my live location"}
      </button>
      <p className="mt-1.5 text-xs text-gray-500">
        {sharing
          ? "Your position updates automatically for the customer. Stops when the delivery is complete."
          : "Turned on automatically — tap to retry if it didn't start, or to pause."}
      </p>
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
