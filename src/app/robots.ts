import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env/public";
import { sectionFromHost, sectionOrigin, mainOrigin } from "@/lib/subdomains";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Deliberately reads process.env directly, same as src/proxy.ts — this
  // route shouldn't ever be coupled to an unrelated env var failing the
  // full serverEnv schema.
  const subdomainRoutingEnabled = process.env.ENABLE_SUBDOMAIN_ROUTING === "true";
  const host = (await headers()).get("host");
  const section = subdomainRoutingEnabled ? sectionFromHost(host, publicEnv.appUrl) : null;

  if (section === "admin") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  if (section === "vendor" || section === "rider") {
    return {
      rules: { userAgent: "*", allow: "/register", disallow: "/" },
      sitemap: `${sectionOrigin(section, publicEnv.appUrl)}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/vendor", "/admin", "/rider", "/checkout", "/api", "/login", "/register", "/cigarettes"],
    },
    sitemap: `${mainOrigin(publicEnv.appUrl)}/sitemap.xml`,
  };
}
