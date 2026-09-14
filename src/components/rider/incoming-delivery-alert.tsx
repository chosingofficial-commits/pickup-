"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, X, Store } from "lucide-react";
import { advanceOrderStatusAction } from "@/lib/actions/orders";
import { initialActionState } from "@/lib/actions/types";

type AvailableDelivery = {
  id: string;
  orderNumber: string;
  vendorBusinessName: string;
  neighbourhoodName: string;
  itemCount: number;
  total: string;
  distanceKm: number | null;
};

const POLL_MS = 5000;

/**
 * Live alert for new available deliveries, only while the rider is online.
 * Unlike the vendor incoming-order alert, deliveries here aren't exclusive
 * to one rider until accepted — so Dismiss just closes this alert (the
 * delivery stays visible on the Available tab for anyone, including this
 * rider, to pick up later) rather than cancelling anything.
 */
export function IncomingDeliveryAlert({ isOnline }: { isOnline: boolean }) {
  const router = useRouter();
  const [queue, setQueue] = useState<AvailableDelivery[]>([]);
  const [busy, setBusy] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/rider/available-deliveries", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: AvailableDelivery[] = await res.json();
        if (cancelled) return;
        const visible = data.filter((d) => !dismissedRef.current.has(d.id));
        const visibleIds = new Set(visible.map((d) => d.id));
        setQueue((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const merged = prev.filter((d) => visibleIds.has(d.id));
          for (const d of visible) {
            if (!existingIds.has(d.id)) merged.push(d);
          }
          return merged;
        });
      } catch {
        // Transient network hiccup — next poll a few seconds later will catch up.
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOnline]);

  const current = isOnline ? (queue[0] ?? null) : null;

  useEffect(() => {
    if (!current) return;

    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = audioCtxRef.current ?? new AudioCtx();
    audioCtxRef.current = ctx;

    const ring = () => {
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [0, 0.28].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 700;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.24);
      });
    };

    ring();
    ringIntervalRef.current = setInterval(ring, 2000);
    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  function dismiss() {
    if (!current) return;
    dismissedRef.current.add(current.id);
    setQueue((prev) => prev.filter((d) => d.id !== current.id));
  }

  async function accept() {
    if (!current || busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("orderId", current.id);
    fd.set("nextStatus", "RIDER_ASSIGNED");
    const result = await advanceOrderStatusAction(initialActionState, fd);
    setQueue((prev) => prev.filter((d) => d.id !== current.id));
    setBusy(false);
    if (result.status !== "error") router.push("/rider/deliveries");
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card bg-white p-6 text-center shadow-lifted">
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-brand-primary text-white">
          <Bike className="h-7 w-7" aria-hidden />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-primary">Delivery available</p>
        <h2 className="mt-1 flex items-center justify-center gap-1.5 font-heading text-lg font-bold text-brand-dark">
          <Store className="h-4 w-4 text-brand-primary" aria-hidden />
          {current.vendorBusinessName}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Deliver to {current.neighbourhoodName} · {current.itemCount} item{current.itemCount === 1 ? "" : "s"}
          {current.distanceKm != null && ` · ${current.distanceKm} km from you`}
        </p>
        <p className="mt-2 font-heading text-lg font-bold text-brand-dark">৳ {current.total}</p>

        {queue.length > 1 && <p className="mt-2 text-xs text-gray-500">+{queue.length - 1} more available</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={dismiss}
            className="flex flex-1 items-center justify-center gap-2 rounded-control border border-border-brand bg-white py-3 text-sm font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden /> Dismiss
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="flex flex-1 items-center justify-center gap-2 rounded-control bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
          >
            <Bike className="h-4 w-4" aria-hidden /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
