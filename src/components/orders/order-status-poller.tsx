"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isTerminal } from "@/lib/orders/status-flow";
import type { OrderStatus } from "@/generated/prisma/client";

const POLL_MS = 4000;

/**
 * Silent — renders nothing. Polls for a status or vendorWaitUntil change
 * (vendor hit Accept / Wait / Reject, rider got assigned, delivery
 * progressed…) and refreshes the server-rendered page so the customer sees
 * it without manually reloading — including the rider tracking card, which
 * only appears once a rider is assigned mid-poll. Stops once the order
 * reaches a terminal status (delivered, cancelled, etc).
 */
export function OrderStatusPoller({ orderId, initialStatus, initialVendorWaitUntil }: { orderId: string; initialStatus: string; initialVendorWaitUntil: string | null }) {
  const router = useRouter();
  const lastSeenRef = useRef({ status: initialStatus, vendorWaitUntil: initialVendorWaitUntil });

  useEffect(() => {
    if (isTerminal(lastSeenRef.current.status as OrderStatus)) return;

    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { status: string; vendorWaitUntil: string | null } = await res.json();
        if (cancelled) return;
        if (data.status !== lastSeenRef.current.status || data.vendorWaitUntil !== lastSeenRef.current.vendorWaitUntil) {
          lastSeenRef.current = data;
          router.refresh();
          if (isTerminal(data.status as OrderStatus)) clearInterval(id);
        }
      } catch {
        // Transient network hiccup — next poll a few seconds later will catch up.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, router]);

  return null;
}
