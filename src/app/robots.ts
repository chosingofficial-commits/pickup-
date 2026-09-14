import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env/public";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/vendor", "/admin", "/rider", "/checkout", "/api", "/login", "/register", "/cigarettes"],
    },
    sitemap: `${publicEnv.appUrl}/sitemap.xml`,
  };
}
