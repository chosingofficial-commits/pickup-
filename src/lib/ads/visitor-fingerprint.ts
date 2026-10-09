import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env/server";
import { getClientIp } from "@/lib/request";

/** How long one visitor's click/view on one ad counts only once. */
export const AD_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/**
 * A salted HMAC of (IP + User-Agent), used only to tell "is this the same
 * visitor as that other request" within the dedupe window — never reversible
 * back to the IP, and the raw IP is never stored anywhere. Reuses
 * AUTH_SECRET as the HMAC key rather than adding a dedicated env var; this is
 * a different cryptographic use (keyed hashing, not session signing) so it
 * doesn't weaken session security.
 */
export async function getVisitorHash(): Promise<string> {
  const ip = await getClientIp();
  const userAgent = (await headers()).get("user-agent") ?? "unknown";
  return createHmac("sha256", serverEnv.AUTH_SECRET).update(`${ip}:${userAgent}`).digest("hex");
}
