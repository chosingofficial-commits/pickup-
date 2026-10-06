import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env/public";
import { sectionFromHost, sectionOrigin, mainOrigin } from "@/lib/subdomains";

// Computed at request time (and cached for an hour) instead of baked into
// the build, since the catalog changes continuously and a build shouldn't
// require live database access.
export const revalidate = 3600;

const STATIC_PATHS = [
  "",
  "/marketplace",
  "/restaurants",
  "/about",
  "/contact",
  "/faq",
  "/support",
  "/coverage",
  "/legal/terms",
  "/legal/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Deliberately reads process.env directly, same as src/proxy.ts — this
  // route shouldn't ever be coupled to an unrelated env var failing the
  // full serverEnv schema.
  const subdomainRoutingEnabled = process.env.ENABLE_SUBDOMAIN_ROUTING === "true";
  const host = (await headers()).get("host");
  const section = subdomainRoutingEnabled ? sectionFromHost(host, publicEnv.appUrl) : null;

  // Vendor/rider sign-up now lives at <section>.<domain>/register — its own
  // one-URL sitemap — instead of under the main domain's /vendor or /rider.
  if (section === "vendor" || section === "rider") {
    return [
      {
        url: `${sectionOrigin(section, publicEnv.appUrl)}/register`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      },
    ];
  }
  // Admin has nothing worth indexing.
  if (section === "admin") return [];

  const base = mainOrigin(publicEnv.appUrl);
  const staticPaths = subdomainRoutingEnabled ? STATIC_PATHS : [...STATIC_PATHS, "/vendor/register", "/rider/register"];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  // The catalog is queried best-effort: a database hiccup (e.g. mid-deploy,
  // before migrations have run) should degrade to a sitemap with just the
  // static pages rather than fail the whole route.
  try {
    const [products, restaurants] = await Promise.all([
      db.product.findMany({
        where: { isPublished: true, isAgeRestricted: false, deletedAt: null },
        select: { slug: true, updatedAt: true, vendor: { select: { slug: true } } },
        take: 5000,
      }),
      db.vendor.findMany({
        where: { businessType: "RESTAURANT", isApproved: true, isSuspended: false },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/marketplace/${p.vendor.slug}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const restaurantEntries: MetadataRoute.Sitemap = restaurants.map((r) => ({
      url: `${base}/restaurants/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    return [...staticEntries, ...productEntries, ...restaurantEntries];
  } catch (err) {
    console.error("sitemap: database unavailable, returning static entries only", err);
    return staticEntries;
  }
}
