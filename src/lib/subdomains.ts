/**
 * Single source of truth for "which path belongs to which subdomain" —
 * imported by `src/proxy.ts` (Node.js runtime, but kept dependency-free
 * anyway so it's trivial to reason about and test), by `roleHome()`, and by
 * every cross-domain link (footer, header, login form, the account-section
 * wrapper layout). Deliberately has zero imports so it's safe from both
 * server and client code (no `server-only`, no Node-specific APIs).
 */

export type Section = "vendor" | "rider" | "admin";

export const SECTIONS: Section[] = ["vendor", "rider", "admin"];

export const SECTION_PREFIX: Record<Section, string> = {
  vendor: "/vendor",
  rider: "/rider",
  admin: "/admin",
};

/**
 * Pages that live under the main domain's route tree but must ALSO render
 * (same page, same already-authenticated subdomain session — never a
 * redirect) when visited from the vendor/rider subdomain: the handful of
 * account pages that apply to any role (see AccountNav's OTHER_ROLE_LINKS,
 * which this list matches exactly) plus the "create a new ad" flow linked
 * from My ads. Customer-only account pages (orders, addresses, wishlist,
 * coupons, favorites, reviews) are deliberately NOT here — those redirect
 * to the main domain, same as any other main-domain-only path.
 */
export const SHARED_PATHS = ["/account", "/account/ads", "/account/notifications", "/account/support", "/account/security", "/advertise"];

export function isSharedPath(pathname: string): boolean {
  return SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Top-level main-domain paths that must redirect to the main domain if
 * requested on a role subdomain — i.e. "this is a real storefront/marketing
 * page, not this section's own clean-URL route". Deliberately a finite,
 * explicit list rather than a guess, so a brand-new vendor/rider dashboard
 * page never accidentally gets treated as "foreign" just because it isn't
 * listed here (the default for an unlisted path is "assume it belongs to
 * this section", which 404s harmlessly if it doesn't exist — see proxy.ts).
 *
 * Deliberately excludes "/register": on a vendor/rider subdomain, bare
 * "/register" IS that section's own sign-up entry point (rewrites to
 * "/vendor/register" or "/rider/register" via the default case below),
 * never the generic main-domain customer sign-up page.
 */
export const MAIN_DOMAIN_PATHS = [
  "/about",
  "/account", // non-shared sub-paths only reach this check — see isSharedPath, checked first
  "/cart",
  "/checkout",
  "/cigarettes",
  "/contact",
  "/coverage",
  "/faq",
  "/legal",
  "/marketplace",
  "/restaurants",
  "/support",
  "/go",
];

export function isMainDomainPath(pathname: string): boolean {
  return MAIN_DOMAIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function parseRoot(appUrl: string): { protocol: string; hostname: string; port: string } {
  const url = new URL(appUrl);
  return { protocol: url.protocol, hostname: url.hostname, port: url.port };
}

/** The exact Host-header value (hostname[:port]) for a given section, derived from APP_URL. */
export function sectionHost(section: Section, appUrl: string): string {
  const { hostname, port } = parseRoot(appUrl);
  return `${section}.${hostname}${port ? `:${port}` : ""}`;
}

/** Full origin (protocol + host) for a given section, e.g. "https://vendor.pickupn.com" or "http://vendor.localhost:3000". */
export function sectionOrigin(section: Section, appUrl: string): string {
  const { protocol } = parseRoot(appUrl);
  return `${protocol}//${sectionHost(section, appUrl)}`;
}

/** Full origin for the main domain — just APP_URL's own origin, normalized. */
export function mainOrigin(appUrl: string): string {
  return new URL(appUrl).origin;
}

/** Which section (if any) a request's Host header belongs to, or null for the main domain / an unrecognized host. */
export function sectionFromHost(host: string | null | undefined, appUrl: string): Section | null {
  if (!host) return null;
  for (const section of SECTIONS) {
    if (host === sectionHost(section, appUrl)) return section;
  }
  return null;
}
