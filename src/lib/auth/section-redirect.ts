import "server-only";
import { headers } from "next/headers";
import { sectionFromHost, mainOrigin } from "@/lib/subdomains";
import { serverEnv } from "@/lib/env/server";

/**
 * Where bare "/" should actually go for the current request. On a
 * vendor/rider/admin subdomain, a same-host redirect("/") rewrites straight
 * back into that section's own dashboard home (see proxy.ts's default
 * rewrite case) — so "wrong role" and "view storefront" links would loop
 * back into the dashboard instead of reaching the real customer storefront.
 * Off a subdomain (main domain, or no subdomain on this request at all),
 * "/" is already correct and this returns it unchanged.
 */
export async function mainDomainHome(): Promise<string> {
  const host = (await headers()).get("host");
  const section = sectionFromHost(host, serverEnv.APP_URL);
  return section ? `${mainOrigin(serverEnv.APP_URL)}/` : "/";
}
