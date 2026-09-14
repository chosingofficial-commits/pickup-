"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Clock, ShoppingBag } from "lucide-react";
import { advanceOrderStatusAction, snoozeOrderAction } from "@/lib/actions/orders";
import { initialActionState } from "@/lib/actions/types";
import type { BusinessType } from "@/generated/prisma/client";

type IncomingOrder = {
  id: string;
  orderNumber: string;
  itemCount: number;
  total: string;
  customerName: string;
  addressLabel: string;
};

const POLL_MS = 4000;

/**
 * Full-screen incoming-order alert, phone-call style: rings on a loop and
 * blocks the dashboard until the vendor accepts, or asks the customer to
 * wait (which snoozes the ring for a few minutes rather than cancelling).
 * Polls /api/vendor/incoming-orders rather than a server action, matching
 * the app's convention of API routes for polling (see rider location /
 * order tracking endpoints) rather than server actions for that job.
 * Wait is restaurant-only — "the restaurant is busy" doesn't read as a
 * sensible reason for a grocery vendor to stall an order, so grocery
 * vendors only get Accept.
 */
export function IncomingOrderAlert({ businessType }: { businessType: BusinessType }) {
  const canWait = businessType === "RESTAURANT";
  const [queue, setQueue] = useState<IncomingOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/vendor/incoming-orders", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: IncomingOrder[] = await res.json();
        if (cancelled) return;
        const incomingIds = new Set(data.map((o) => o.id));
        setQueue((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const merged = prev.filter((o) => incomingIds.has(o.id));
          for (const o of data) {
            if (!existingIds.has(o.id)) merged.push(o);
          }
          return merged;
        });
      } catch {
        // Transient network hiccup — the next poll a few seconds later will catch up.
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (!current) return;

    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = audioCtxRef.current ?? new AudioCtx();
    audioCtxRef.current = ctx;

    const ring = () => {
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      // Two short beeps per pulse, phone-ring cadence.
      [0, 0.28].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 900;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.24);
      });
    };

    ring();
    ringIntervalRef.current = setInterval(ring, 1600);
    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    };
    // Re-arm only when the front-of-queue order changes, not on every queue mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  async function accept() {
    if (!current || busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("orderId", current.id);
    fd.set("nextStatus", "CONFIRMED");
    await advanceOrderStatusAction(initialActionState, fd);
    setQueue((prev) => prev.filter((o) => o.id !== current.id));
    setBusy(false);
  }

  async function wait() {
    if (!current || busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("orderId", current.id);
    await snoozeOrderAction(initialActionState, fd);
    // Snoozed order drops out of the poll response for a few minutes — remove it
    // from the local queue now so the alert doesn't keep ringing for it meanwhile.
    setQueue((prev) => prev.filter((o) => o.id !== current.id));
    setBusy(false);
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card bg-white p-6 text-center shadow-lifted">
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-brand-primary text-white">
          <ShoppingBag className="h-7 w-7" aria-hidden />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-primary">Incoming order</p>
        <h2 className="mt-1 font-heading text-xl font-bold text-brand-dark">{current.orderNumber}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {current.customerName} · {current.itemCount} item{current.itemCount === 1 ? "" : "s"}
        </p>
        {current.addressLabel && <p className="text-sm text-gray-600">{current.addressLabel}</p>}
        <p className="mt-2 font-heading text-lg font-bold text-brand-dark">৳ {current.total}</p>

        {queue.length > 1 && <p className="mt-2 text-xs text-gray-500">+{queue.length - 1} more waiting</p>}

        <div className="mt-6 flex gap-3">
          {canWait && (
            <button
              type="button"
              disabled={busy}
              onClick={wait}
              className="flex flex-1 items-center justify-center gap-2 rounded-control border border-border-brand bg-white py-3 text-sm font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-50"
            >
              <Clock className="h-4 w-4" aria-hidden /> Wait
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="flex flex-1 items-center justify-center gap-2 rounded-control bg-brand-primary py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
          >
            <Phone className="h-4 w-4" aria-hidden /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
