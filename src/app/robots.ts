import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env/public";
import { sectionFromHost, sectionOrigin, mainOrigin, isSubdomainRoutingEnabled } from "@/lib/subdomains";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  // Deliberately reads process.env directly, same as src/proxy.ts — see
  // isSubdomainRoutingEnabled's doc comment (src/lib/subdomains.ts) for
  // the full on/off/auto-detect logic.
  const subdomainRoutingEnabled = isSubdomainRoutingEnabled(host, process.env.NEXT_PUBLIC_APP_URL, process.env.ENABLE_SUBDOMAIN_ROUTING);
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
