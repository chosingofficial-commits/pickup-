import { NextResponse, type NextRequest } from "next/server";
import {
  SECTIONS,
  SECTION_PREFIX,
  isSharedPath,
  isMainDomainPath,
  sectionFromHost,
  sectionOrigin,
  mainOrigin,
  isProductionHost,
  productionRootDomain,
  isSubdomainRoutingEnabled,
} from "@/lib/subdomains";
import { publicEnv } from "@/lib/env/public";

function appUrl(host: string | null): string {
  // publicEnv.appUrl is NEXT_PUBLIC_APP_URL (inlined into the bundle at
  // build time), falling back to "http://localhost:3000" only when that
  // var was never set at all. That generic localhost fallback must never
  // actually be used to build a redirect while serving a real production
  // host — substitute the hardcoded production domain instead whenever
  // that's the case, so this can never redirect a real visitor to
  // localhost.
  if (publicEnv.appUrl === "http://localhost:3000" && isProductionHost(host, process.env.NEXT_PUBLIC_APP_URL)) {
    return `https://${productionRootDomain(process.env.NEXT_PUBLIC_APP_URL)}`;
  }
  return publicEnv.appUrl;
}

// Routing only — never an authorization decision. Every page/action this
// might route a request to still runs its own getCurrentUser()/role check
// exactly as before; subdomain routing being on or off only changes which
// host a request is expected to arrive on, never who's allowed to see it.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  // Deliberately reads process.env directly (not the Zod-validated
  // serverEnv module) — proxy runs on every single request, and its
  // routing shouldn't ever be coupled to (or crash from) an unrelated env
  // var failing full validation elsewhere in the app. See
  // isSubdomainRoutingEnabled's doc comment (src/lib/subdomains.ts) for
  // the full on/off/auto-detect logic.
  if (!isSubdomainRoutingEnabled(host, process.env.NEXT_PUBLIC_APP_URL, process.env.ENABLE_SUBDOMAIN_ROUTING)) {
    return NextResponse.next();
  }

  const url = appUrl(host);
  const { pathname, search } = request.nextUrl;
  const section = sectionFromHost(host, url);

  if (!section) {
    // Main domain: redirect any /vendor, /rider, /admin path to its subdomain,
    // prefix stripped (e.g. pickupn.com/vendor/menu -> vendor.pickupn.com/menu).
    for (const s of SECTIONS) {
      const prefix = SECTION_PREFIX[s];
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        const stripped = pathname.slice(prefix.length) || "/";
        return NextResponse.redirect(`${sectionOrigin(s, url)}${stripped}${search}`);
      }
    }
    return NextResponse.next();
  }

  // On a role subdomain from here on.
  if (pathname === "/login" || pathname.startsWith("/login/") || isSharedPath(pathname)) {
    // Always local to this subdomain — own login page, and the handful of
    // account/advertise pages that work the same on every subdomain using
    // that subdomain's own session (see (storefront)/layout.tsx).
    return NextResponse.next();
  }

  const ownPrefix = SECTION_PREFIX[section];
  if (pathname === ownPrefix || pathname.startsWith(`${ownPrefix}/`)) {
    // Already correctly prefixed — e.g. an internal redirect()/Link that
    // still uses the pre-subdomain "/vendor/..." form. Render as-is rather
    // than double-rewriting; nothing inside the dashboards needs to change.
    return NextResponse.next();
  }

  const otherSection = SECTIONS.find((s) => s !== section && (pathname === SECTION_PREFIX[s] || pathname.startsWith(`${SECTION_PREFIX[s]}/`)));
  if (otherSection || isMainDomainPath(pathname)) {
    // Wrong subdomain for this path, or a genuine main-domain page (the
    // storefront, checkout, etc.) — send it to the main domain, which will
    // redirect onward to the right subdomain itself if it belongs to one.
    return NextResponse.redirect(`${mainOrigin(url)}${pathname}${search}`);
  }

  // Anything else (bare "/", "/menu", "/orders/123", ...) is this section's
  // own clean-URL route — invisible rewrite, never shown in the browser.
  // If it doesn't actually exist under this prefix, this 404s normally,
  // same as any other unmatched Next.js route.
  return NextResponse.rewrite(new URL(`${ownPrefix}${pathname === "/" ? "" : pathname}${search}`, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)"],
};
