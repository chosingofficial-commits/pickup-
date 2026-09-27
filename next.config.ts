import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle (.next/standalone) that can run
  // with `node server.js` on any Node.js host — including Hostinger's
  // Node.js Web App / Cloud / VPS hosting, or the Dockerfile in this repo.
  output: "standalone",

  experimental: {
    serverActions: {
      // Default is 1MB, too small for a phone photo of an NID (2-5MB typical).
      // Set well above the 5MB app-level file-size limit enforced in
      // registerRiderAction, so an oversized upload reaches that check and
      // gets a clear error message instead of being cut off by this generic
      // framework limit first.
      bodySizeLimit: "10mb",
    },
  },

  images: {
    // Product/vendor/ad images are uploaded to whatever S3-compatible
    // endpoint an operator configures at deploy time (see StorageAdapter),
    // so the hostname isn't known at build time — allow any https origin
    // rather than disabling optimization outright, which would also skip
    // resizing/format conversion for the app's own local /public assets.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
