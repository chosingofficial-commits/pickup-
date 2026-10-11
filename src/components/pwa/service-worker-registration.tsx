"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js site-wide (every subdomain registers its own copy — a
 * service worker's scope is per-origin, so vendor.pickupn.com and
 * rider.pickupn.com each get their own independent registration even
 * though it's the same file). Silently does nothing in browsers without
 * support (old Safari, some in-app webviews) — this is a progressive
 * enhancement, never a requirement to use the site.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail in contexts that disallow it (e.g. some
      // embedded webviews) — push/installability just aren't available
      // there, nothing else in the app depends on this succeeding.
    });
  }, []);

  return null;
}
