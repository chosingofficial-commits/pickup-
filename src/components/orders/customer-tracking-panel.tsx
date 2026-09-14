"use client";

import { useEffect, useState } from "react";
import { DeliveryMap } from "@/components/maps/delivery-map";

type TrackingResponse =
  | { active: false }
  | {
      active: true;
      rider: { lat: number; lng: number; recordedAt: string } | null;
      pickup: { lat: number; lng: number } | null;
      drop: { lat: number; lng: number } | null;
      etaMinutes: number | null;
    };

const POLL_INTERVAL_MS = 8000;

export function CustomerTrackingPanel({
  orderId,
  vendorName,
  dropLabel = "You",
}: {
  orderId: string;
  vendorName: string;
  dropLabel?: string;
}) {
  const [data, setData] = useState<TrackingResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}/tracking`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as TrackingResponse;
        if (!cancelled) setData(json);
      } catch {
        // Ignore transient network errors — next poll will retry.
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  if (!data?.active || !data.pickup || !data.drop) return null;

  return (
    <DeliveryMap
      pickup={{ ...data.pickup, label: vendorName }}
      drop={{ ...data.drop, label: dropLabel }}
      rider={data.rider}
      etaMinutes={data.etaMinutes}
    />
  );
}
