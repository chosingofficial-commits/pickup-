"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { sendPushToUser } from "@/lib/push/send";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Called directly from client code (not through a <form>) — the
 * subscription only exists after an async browser API call
 * (pushManager.subscribe()), so there's no real form to bind to here,
 * unlike every other action in this app.
 */
export async function subscribeToPushAction(subscription: PushSubscriptionInput, userAgent: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in." };
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { ok: false, message: "Invalid subscription." };
  }

  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { userId: user.id, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
    // An endpoint moving to a different user (a shared/kiosk device, or the
    // same browser profile logging into a different account) must re-point
    // to the new owner — never keep alerting whoever subscribed it first.
    update: { userId: user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent, lastUsedAt: new Date() },
  });

  return { ok: true };
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  // Scoped by userId too, not just endpoint — never lets a request delete a
  // subscription row it doesn't own even if it somehow knew the endpoint.
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}

export async function sendTestPushAction(): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in." };

  const count = await db.pushSubscription.count({ where: { userId: user.id } });
  if (count === 0) return { ok: false, message: "Turn on alerts first, then try again." };

  await sendPushToUser(user.id, {
    title: "Test alert",
    body: "This is what your order alerts will look like.",
    url: user.role === "VENDOR" ? "/vendor" : user.role === "RIDER" ? "/rider" : "/",
    tag: "test-alert",
  });
  return { ok: true, message: "Sent — it should arrive in a few seconds." };
}
