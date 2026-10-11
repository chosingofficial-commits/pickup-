import { describe, it, expect } from "vitest";
import { isRenderableImageUrl } from "./image-url";

describe("isRenderableImageUrl", () => {
  it("allows any https URL (matches next.config.mjs's https/** remotePattern)", () => {
    expect(isRenderableImageUrl("https://pftpxwlrjfgjkzoajgzx.supabase.co/storage/v1/object/public/uploads/x.png")).toBe(true);
    // Syntactically valid https, so next/image won't throw — but the file
    // may not actually exist there (a stale pre-S3-migration URL). This
    // function only guards against the render-time crash, not a 404; that
    // still shows as a broken image, which is the correct degraded state.
    expect(isRenderableImageUrl("https://pickupn.com/uploads/dev/stale.png")).toBe(true);
  });

  it("allows http only on localhost (the local storage adapter's fallback shape)", () => {
    expect(isRenderableImageUrl("http://localhost:3000/uploads/dev/x.png")).toBe(true);
  });

  it("rejects http on any other host", () => {
    expect(isRenderableImageUrl("http://pickupn.com/uploads/dev/x.png")).toBe(false);
    expect(isRenderableImageUrl("http://example.com/x.png")).toBe(false);
  });

  it("rejects malformed or non-URL strings instead of throwing", () => {
    expect(isRenderableImageUrl("not a url")).toBe(false);
    expect(isRenderableImageUrl("/relative/path.png")).toBe(false);
    expect(isRenderableImageUrl("")).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isRenderableImageUrl(null)).toBe(false);
    expect(isRenderableImageUrl(undefined)).toBe(false);
  });
});
