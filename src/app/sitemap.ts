import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicEnv } from "@/lib/env/public";

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
  "/vendor/register",
  "/rider/register",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.appUrl;

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
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
