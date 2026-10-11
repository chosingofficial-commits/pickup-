"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, ShieldAlert } from "lucide-react";
import { subscribeToPushAction, unsubscribeFromPushAction, sendTestPushAction } from "@/lib/actions/push";
import { urlBase64ToUint8Array, detectPlatform, isStandalone } from "@/lib/push/client";
import { publicEnv } from "@/lib/env/public";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

type Status = "checking" | "unsupported" | "not-configured" | "needs-install" | "blocked" | "off" | "on";

/**
 * "Turn on order alerts" card — vendor and rider dashboards both render
 * this with a role-specific description. All browser/permission state is
 * read client-side (Notification.permission, PushManager.getSubscription())
 * rather than round-tripping to the server, since none of it is server
 * state. subscribeToPushAction/unsubscribeFromPushAction/sendTestPushAction
 * are called directly (not through a <form>) since the subscription object
 * only exists after an async browser API call.
 */
export function PushAlertsCard({ role }: { role: "vendor" | "rider" }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    async function check() {
      setPlatform(detectPlatform());
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (!publicEnv.vapidPublicKey) {
        setStatus("not-configured");
        return;
      }
      if (detectPlatform() === "ios" && !isStandalone()) {
        setStatus("needs-install");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    check();
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // TS's DOM lib wants BufferSource's ArrayBufferView<ArrayBuffer>
          // exactly — a plain Uint8Array backed by a real (non-shared)
          // ArrayBuffer satisfies this at runtime but not the stricter
          // generic signature, hence the cast.
          applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) as BufferSource,
        });
      }
      const result = await subscribeToPushAction(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }, navigator.userAgent);
      if (result.ok) {
        setStatus("on");
        setMessage({ kind: "success", text: "Order alerts are on." });
      } else {
        setMessage({ kind: "error", text: result.message ?? "Couldn't turn on alerts." });
      }
    } catch (err) {
      console.error("[push] enable failed:", err);
      setMessage({ kind: "error", text: "Couldn't turn on alerts. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMessage({ kind: "success", text: "Order alerts are off." });
    } catch (err) {
      console.error("[push] disable failed:", err);
      setMessage({ kind: "error", text: "Couldn't turn off alerts." });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    const result = await sendTestPushAction();
    setMessage({ kind: result.ok ? "success" : "error", text: result.message });
    setBusy(false);
  }

  if (status === "checking") return null;
  if (status === "unsupported") return null; // nothing actionable to show — silently absent, not a dead-end card
  if (status === "not-configured") return null;

  const subject = role === "vendor" ? "new orders" : "new deliveries";

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              status === "on" ? "bg-brand-primary/15 text-brand-primary" : status === "blocked" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
            }`}
          >
            {status === "on" ? <BellRing className="h-5 w-5" aria-hidden /> : status === "blocked" ? <ShieldAlert className="h-5 w-5" aria-hidden /> : <BellOff className="h-5 w-5" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>Order alerts</CardTitle>
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span className={`font-semibold ${status === "on" ? "text-brand-primary" : status === "blocked" ? "text-red-600" : "text-amber-700"}`}>
                {status === "on" ? "On" : status === "blocked" ? "Blocked" : status === "needs-install" ? "Not installed yet" : "Off"}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Get a notification the moment {subject} come in, even when Pick Up isn&apos;t open in front of you.
        </p>

        {message && (
          <p role="status" className={`mt-3 text-sm ${message.kind === "success" ? "text-brand-primary" : "text-red-600"}`}>
            {message.text}
          </p>
        )}

        {status === "needs-install" && (
          <div className="mt-4 rounded-control bg-amber-50 p-3.5 text-sm text-amber-900">
            <p className="font-semibold">Add Pick Up to your Home Screen first</p>
            <p className="mt-1">On iPhone, Safari only allows order alerts for apps installed to the Home Screen — see the iPhone steps below, then come back here to turn alerts on.</p>
          </div>
        )}

        {status === "blocked" && (
          <div className="mt-4 rounded-control bg-red-50 p-3.5 text-sm text-red-900">
            <p className="font-semibold">Notifications are blocked for Pick Up</p>
            {platform === "android" ? (
              <p className="mt-1">Tap the lock/info icon next to the address bar → Permissions → Notifications → Allow. Then reload this page.</p>
            ) : platform === "ios" ? (
              <p className="mt-1">Open the iPhone Settings app → Notifications → Pick Up → turn Allow Notifications on. Then come back here.</p>
            ) : (
              <p className="mt-1">Open your browser&apos;s site settings for this page and allow Notifications, then reload.</p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {(status === "off") && (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="flex h-10 items-center gap-2 rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
            >
              <Bell className="h-4 w-4" aria-hidden />
              {busy ? "Turning on…" : "Turn on order alerts"}
            </button>
          )}
          {status === "on" && (
            <>
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className="h-10 rounded-control border border-border-brand bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send me a test alert"}
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="h-10 rounded-control border border-border-brand bg-white px-4 text-sm font-semibold text-gray-600 hover:bg-brand-bg disabled:opacity-60"
              >
                Turn off
              </button>
            </>
          )}
        </div>

        <details className="mt-4 text-sm text-gray-600" open={status !== "on"}>
          <summary className="cursor-pointer font-semibold text-brand-dark">How to set this up</summary>
          <div className="mt-2 space-y-3">
            <div>
              <p className="font-semibold text-brand-dark">On Android (Chrome)</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>Open this page in Chrome.</li>
                <li>Optional: tap the browser menu → &quot;Add to Home screen&quot; / &quot;Install app&quot; for one-tap access.</li>
                <li>Tap &quot;Turn on order alerts&quot; above and allow notifications when asked.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-brand-dark">On iPhone (Safari)</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>
                  Open this page in Safari, tap the Share icon, then <span className="font-medium">&quot;Add to Home Screen&quot;</span>.
                </li>
                <li>Open Pick Up from the new Home Screen icon (not the Safari tab) — iPhone only allows alerts for installed apps.</li>
                <li>On the Pick Up app, tap &quot;Turn on order alerts&quot; and allow notifications when asked.</li>
              </ol>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
