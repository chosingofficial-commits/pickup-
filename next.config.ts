import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle (.next/standalone) that can run
  // with `node server.js` on any Node.js host — including Hostinger's
  // Node.js Web App / Cloud / VPS hosting, or the Dockerfile in this repo.
  output: "standalone",

  images: {
    // Product/vendor/ad images are uploaded to whatever S3-compatible
    // endpoint an operator configures at deploy time (see StorageAdapter),
    // so the hostname isn't known at build time. Optimization is disabled
    // rather than allow-listing every possible provider domain.
    unoptimized: true,
  },
};

export default nextConfig;
