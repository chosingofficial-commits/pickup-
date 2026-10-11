/**
 * Mirrors next.config.mjs's `images.remotePatterns` — https from any host,
 * or http only on localhost (the local filesystem storage adapter's
 * fallback URL shape; see src/lib/storage/local-adapter.ts). next/image
 * throws synchronously during render for any `src` outside this allowlist
 * ("Invalid src prop ... hostname is not configured"), which takes down
 * the whole page, not just that one image — a stale/malformed URL stored
 * on a Vendor, Product, MenuItem, etc. must never reach `<Image>` or
 * `getImageProps` directly. Every component that renders a stored image
 * URL through next/image's optimizer (not `unoptimized`) must check this
 * first and fall back to its own placeholder when it's false.
 *
 * Keep this in sync with next.config.mjs if that allowlist ever changes.
 */
export function isRenderableImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") return true;
  return parsed.protocol === "http:" && parsed.hostname === "localhost";
}
