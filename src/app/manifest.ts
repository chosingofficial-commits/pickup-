import type { MetadataRoute } from "next";

/**
 * Served at /manifest.webmanifest, auto-linked into every page's <head> by
 * Next.js (no manual <link rel="manifest"> needed). Works identically on
 * every subdomain (vendor.pickupn.com, rider.pickupn.com, the main domain)
 * since start_url/scope are root-relative — each resolves against whichever
 * host actually served the page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pick Up",
    short_name: "Pick Up",
    description: "Everything you need, delivered fast — groceries, essentials, and restaurant food in Khagrachari Sadar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#e8f5e9",
    theme_color: "#1b5e20",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
