import type { UserRole } from "@/generated/prisma/client";

/**
 * Where "My ads" lives for a given role — each role manages its ads from its
 * own dashboard; customers keep the shared account area. Dependency-free on
 * purpose (no db/server-only import) so lifecycle.ts and queries.ts can both
 * use it without a circular import between them.
 */
export function myAdsHref(role: UserRole): string {
  if (role === "VENDOR") return "/vendor/ads";
  if (role === "RIDER") return "/rider/ads";
  return "/account/ads";
}
