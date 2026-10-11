import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

let configured = false;
let warnedUnconfigured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!serverEnv.VAPID_PRIVATE_KEY || !publicEnv.vapidPublicKey) {
    if (!warnedUnconfigured) {
      console.warn("[push] VAPID keys not configured — sendPushToUser() is a no-op until NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set.");
      warnedUnconfigured = true;
    }
    return false;
  }
  webpush.setVapidDetails(serverEnv.VAPID_SUBJECT, publicEnv.vapidPublicKey, serverEnv.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Opened (focused or navigated to) when the notification is tapped. */
  url: string;
  /** A fresh push with the same tag replaces the previous one instead of stacking — see this module's doc comment. */
  tag: string;
};

/**
 * Sends a push to every subscription this user owns (phone + desktop, a
 * second browser, etc) — always scoped by `userId` straight from the DB
 * query, never by a client-supplied subscription id, so this can never
 * reach the wrong person. Never throws: a push failure must never break
 * the caller's primary action (placing an order, broadcasting to riders,
 * assigning a rider). A 404/410 response means the push service has
 * permanently discarded that one endpoint (the browser unsubscribed, the
 * profile was removed, etc) — that subscription row is deleted so it's
 * never retried; any other error is logged and left alone as possibly
 * transient. No-ops (silently, after one warning) when VAPID isn't
 * configured yet, so a deploy without push set up keeps working exactly as
 * it did before this feature existed.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[push] send failed for subscription ${sub.id} (user ${userId}):`, err);
        }
      }
    }),
  );
}
