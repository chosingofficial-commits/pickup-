// Pick Up service worker — deliberately minimal: push notifications and
// notification clicks only. No fetch handler, no caching of pages, API
// responses, or anything else. The vendor/rider dashboards (and every
// other page) must always show live data and a live login state — a
// caching service worker here would risk a vendor staring at a stale
// orders list, or a logged-out page served from cache after sign-out.
// If a future version ever adds caching, it must stay strictly opt-in
// per-asset (e.g. static icons only), never pages or API routes.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  if (!data.title) return;

  // The vendor/rider dashboards already ring + show a full-screen alert for
  // the same events while a tab is open and visible (IncomingOrderAlert /
  // IncomingDeliveryAlert, polling every few seconds) — showing a system
  // notification on top of that would double-alert for the same order.
  // Skip it only when a visible tab exists; a backgrounded/minimized tab
  // still gets the system notification, since the in-page alert can't be
  // seen or heard in that case either.
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const hasVisibleClient = windows.some((c) => c.visibilityState === "visible");
  if (hasVisibleClient) return;

  await self.registration.showNotification(data.title, {
    body: data.body ?? "",
    tag: data.tag,
    // A fresh notification with the same tag replaces the old one instead
    // of stacking (e.g. re-clicking "Find rider" for the same order) — but
    // still re-alerts (vibrate/re-surface) rather than updating silently.
    renotify: true,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url ?? "/" },
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(focusOrOpen(url));
});

async function focusOrOpen(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const target = new URL(url, self.location.origin).href;
  for (const client of windows) {
    if (client.url === target && "focus" in client) return client.focus();
  }
  // No exact match — reuse any open tab on the same origin rather than
  // opening a new one, navigating it to the right place.
  for (const client of windows) {
    if (new URL(client.url).origin === self.location.origin) {
      await client.navigate(target);
      return client.focus();
    }
  }
  return self.clients.openWindow(target);
}
