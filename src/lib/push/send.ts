import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

export type PushConfigStatus = { configured: boolean; reason?: string };

// A real VAPID keypair is a P-256 (prime256v1) key: the public half is a
// 65-byte uncompressed EC point, the private half a 32-byte scalar — both
// base64url-encoded. Checking the decoded length catches the two most
// common ways a pasted value goes bad (truncated copy, or a stray
// trailing newline/space from a clipboard tool corrupting the base64url
// decode) with a message that's diagnostic without ever containing the
// key itself.
const EXPECTED_PUBLIC_KEY_BYTES = 65;
const EXPECTED_PRIVATE_KEY_BYTES = 32;

function checkKeyLength(value: string, varName: string, expectedBytes: number): string | null {
  let decoded: Buffer;
  try {
    decoded = Buffer.from(value, "base64url");
  } catch {
    return `${varName} isn't valid base64url`;
  }
  if (decoded.length !== expectedBytes) {
    return `${varName} has the wrong length after decoding (expected ${expectedBytes} bytes, got ${decoded.length}) — check for a truncated copy or stray whitespace`;
  }
  return null;
}

/** Computed once per process (env vars don't change without a restart) and reused — never logs or returns the key values themselves, only pass/fail + a diagnostic reason. Exported for the admin-only "Push alerts: configured/not configured" status line. */
export function getPushConfigStatus(): PushConfigStatus {
  const publicKey = publicEnv.vapidPublicKey;
  const privateKey = serverEnv.WEB_PUSH_SECRET ?? "";

  if (!publicKey) return { configured: false, reason: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set" };
  if (!privateKey) return { configured: false, reason: "WEB_PUSH_SECRET is not set" };

  const publicKeyIssue = checkKeyLength(publicKey, "NEXT_PUBLIC_VAPID_PUBLIC_KEY", EXPECTED_PUBLIC_KEY_BYTES);
  if (publicKeyIssue) return { configured: false, reason: publicKeyIssue };

  const privateKeyIssue = checkKeyLength(privateKey, "WEB_PUSH_SECRET", EXPECTED_PRIVATE_KEY_BYTES);
  if (privateKeyIssue) return { configured: false, reason: privateKeyIssue };

  return { configured: true };
}

// TEMPORARY — admin-only debugging aid, now covering every env var the app
// still reads after the hPanel var-count cleanup (see server.ts's comments
// on APP_URL/STORAGE_PROVIDER/S3_* and WEB_PUSH_SECRET). Shows presence +
// LENGTH only, never a value, read two ways: straight off `process.env`
// (what THIS request, in this exact running process, sees right now) and
// through the parsed serverEnv/publicEnv singletons (what the app's code
// actually uses, computed once when this process's modules first loaded —
// so a value with a safe default, like S3_REGION, can show a non-zero
// parsed length while its process.env row still correctly says "no").
// NODE_ENV is included because STORAGE_PROVIDER's production-only default
// depends on it reading exactly "production" — if it doesn't, uploads
// would silently fall back to local disk storage in production. Remove
// this export (and its one caller in admin/settings/page.tsx) once hPanel's
// var count is confirmed stable.
// Three states, not two — "blank" (present but "" or whitespace-only) is
// the exact class of bug that slipped past a plain `??`/`.default(...)`
// fallback once already (see server.ts/public.ts's blankToUndefined), so
// it gets surfaced here rather than collapsing into the same "no" as
// genuinely unset.
function classifyProcessEnv(name: string): { name: string; status: "unset" | "blank" | "set"; rawLength: number } {
  const raw = process.env[name];
  if (raw === undefined) return { name, status: "unset", rawLength: 0 };
  if (raw.trim() === "") return { name, status: "blank", rawLength: raw.length };
  return { name, status: "set", rawLength: raw.length };
}

export function getVapidEnvDiagnostics() {
  const runtimeSecrets = ["DATABASE_URL", "DATABASE_POOL_URL", "AUTH_SECRET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "WEB_PUSH_SECRET"] as const;
  const runtimeFromProcessEnv = runtimeSecrets.map(classifyProcessEnv);
  const runtimeFromParsedEnv = [
    { name: "DATABASE_URL (serverEnv)", length: serverEnv.DATABASE_URL?.length ?? 0 },
    { name: "DATABASE_POOL_URL (serverEnv)", length: serverEnv.DATABASE_POOL_URL?.length ?? 0 },
    { name: "AUTH_SECRET (serverEnv)", length: serverEnv.AUTH_SECRET?.length ?? 0 },
    { name: "S3_ACCESS_KEY_ID (serverEnv)", length: serverEnv.S3_ACCESS_KEY_ID?.length ?? 0 },
    { name: "S3_SECRET_ACCESS_KEY (serverEnv)", length: serverEnv.S3_SECRET_ACCESS_KEY?.length ?? 0 },
    { name: "WEB_PUSH_SECRET (serverEnv)", length: serverEnv.WEB_PUSH_SECRET?.length ?? 0 },
  ];

  // Still required in hPanel (no safe guessable default — see server.ts).
  const noDefaultVars = ["S3_ENDPOINT", "S3_PUBLIC_URL_BASE", "ENABLE_SUBDOMAIN_ROUTING", "APP_URL", "NEXT_PUBLIC_APP_URL"] as const;
  const noDefaultFromProcessEnv = noDefaultVars.map(classifyProcessEnv);

  // Now have a production-safe default baked into server.ts — should show
  // "unset" or "blank" under process.env (unless you've deliberately kept
  // an override in hPanel) but still a sensible non-zero length under "as
  // parsed" either way, since blank is treated the same as unset now.
  const nowDefaultedVars = ["STORAGE_PROVIDER", "S3_REGION", "S3_BUCKET", "S3_PRIVATE_BUCKET", "S3_FORCE_PATH_STYLE", "VAPID_SUBJECT"] as const;
  const nowDefaultedFromProcessEnv = nowDefaultedVars.map(classifyProcessEnv);
  const nowDefaultedFromParsedEnv = [
    { name: "STORAGE_PROVIDER (serverEnv)", length: serverEnv.STORAGE_PROVIDER.length },
    { name: "S3_REGION (serverEnv)", length: serverEnv.S3_REGION?.length ?? 0 },
    { name: "S3_BUCKET (serverEnv)", length: serverEnv.S3_BUCKET?.length ?? 0 },
    { name: "S3_PRIVATE_BUCKET (serverEnv)", length: serverEnv.S3_PRIVATE_BUCKET?.length ?? 0 },
    { name: "S3_FORCE_PATH_STYLE (serverEnv)", length: String(serverEnv.S3_FORCE_PATH_STYLE).length },
    { name: "VAPID_SUBJECT (serverEnv)", length: serverEnv.VAPID_SUBJECT.length },
  ];

  // NEXT_PUBLIC_VAPID_PUBLIC_KEY now has a hardcoded fallback too (see
  // publicEnv.ts) — included separately since, unlike the server-only vars
  // above, it's inlined at BUILD time, so its process.env row reflects what
  // the BUILD saw, not necessarily what this runtime process sees.
  const publicKeyFromProcessEnv = classifyProcessEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const publicKeyFromParsedEnv = { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY (publicEnv.vapidPublicKey)", length: publicEnv.vapidPublicKey.length };

  const otherVapidLikeKeys = Object.keys(process.env)
    .filter((key) => key.toUpperCase().includes("VAPID") && key !== "NEXT_PUBLIC_VAPID_PUBLIC_KEY")
    .map((key) => ({ key, length: process.env[key]?.length ?? 0 }));

  return {
    nodeEnv: process.env.NODE_ENV ?? "(unset)",
    runtimeFromProcessEnv,
    runtimeFromParsedEnv,
    noDefaultFromProcessEnv,
    nowDefaultedFromProcessEnv,
    nowDefaultedFromParsedEnv,
    publicKeyFromProcessEnv,
    publicKeyFromParsedEnv,
    otherVapidLikeKeys,
  };
}

let vapidDetailsSet = false;
let warnedUnconfigured = false;

function ensureConfigured(): boolean {
  const status = getPushConfigStatus();
  if (!status.configured) {
    if (!warnedUnconfigured) {
      // process.uptime() under ~60s when this first fires means the var was
      // missing from the very start of this process — i.e. the env var
      // wasn't actually picked up by this deploy/restart, not that it was
      // added after a long-running process started and just needs a
      // restart. Compare against your deploy time in hPanel's logs.
      console.warn(`[push] Not configured (process uptime ${Math.round(process.uptime())}s) — sendPushToUser() is a no-op. Reason: ${status.reason}`);
      warnedUnconfigured = true;
    }
    return false;
  }
  if (!vapidDetailsSet) {
    webpush.setVapidDetails(serverEnv.VAPID_SUBJECT, publicEnv.vapidPublicKey, serverEnv.WEB_PUSH_SECRET!);
    vapidDetailsSet = true;
  }
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
  // The whole body is one top-level try/catch — not just the per-subscription
  // send below. The earlier version only guarded webpush.sendNotification(),
  // leaving the pushSubscription.findMany() query itself able to throw (e.g.
  // a transient DB blip) straight up to the caller. Every caller of this
  // function (place-order.ts, orders.ts, admin-orders.ts) runs it inside the
  // same try/catch that wraps order placement/assignment — an uncaught
  // throw here would read as "placing the order failed" to the customer,
  // even though the order had already committed. This function's whole
  // point is that a push problem can never surface as an order problem, so
  // nothing in it may ever throw, full stop.
  try {
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
  } catch (err) {
    console.error(`[push] sendPushToUser failed unexpectedly for user ${userId}:`, err);
  }
}
