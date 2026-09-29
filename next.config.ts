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
    // Default is (CPU count - 1) build workers, which on Hostinger's build
    // machine spawns far more parallel workers than its actual memory/process
    // headroom supports — this is what caused both the EMAXCONNSESSION
    // (Supabase session-pooler exhaustion, 15-connection cap vs. 47 workers)
    // and the "node process exited before we could connect to it" Turbopack
    // subprocess crash on repeated deploys. Capping it well below what a
    // small container can autodetect trades build speed for reliability.
    cpus: 2,
  },

  images: {
    // Product/vendor/ad images are uploaded to whatever S3-compatible
    // endpoint an operator configures at deploy time (see StorageAdapter),
    // so the hostname isn't known at build time — allow any https origin
    // rather than disabling optimization outright, which would also skip
    // resizing/format conversion for the app's own local /public assets.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // The local filesystem fallback storage adapter (no object storage
      // configured) returns an http://localhost URL — harmless to allow in
      // production too, since nothing there is ever reachable at localhost.
      { protocol: "http", hostname: "localhost" },
    ],
    // Next's image optimizer independently refuses to fetch from any
    // hostname that resolves to a private/loopback IP (an SSRF guard,
    // separate from remotePatterns above) — localhost always resolves to
    // one, so the pattern alone isn't enough for local dev/testing to ever
    // render the fallback-storage URL. Gated behind an explicit env var
    // (never set in the real deploy) so production keeps the SSRF
    // protection; `next build` always forces NODE_ENV=production even for
    // local test builds, so that alone can't be the gate.
    dangerouslyAllowLocalIP: process.env.ALLOW_LOCAL_IMAGE_HOSTS === "1",
  },
};

export default nextConfig;
