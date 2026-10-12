import { describe, it, expect, afterEach, vi } from "vitest";

// Regression coverage for a real bug: `env ?? DEFAULT` only falls back when
// the var is genuinely absent (null/undefined) — a host env-var UI can
// leave a var present-but-blank ("" or whitespace), which `??` does NOT
// treat as missing. That silently produced an empty VAPID public key in
// production even with the hardcoded fallback in place. Each test imports
// the module fresh (vi.resetModules) so it picks up the stubbed env.
describe("publicEnv.vapidPublicKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to the hardcoded default when the env var is blank (whitespace-only), not just when it's unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "   ");
    const { publicEnv } = await import("./public");
    expect(publicEnv.vapidPublicKey.length).toBe(87);
  });

  it("falls back to the hardcoded default when the env var is an empty string", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    const { publicEnv } = await import("./public");
    expect(publicEnv.vapidPublicKey.length).toBe(87);
  });

  it("still uses a real override value when one is actually set", async () => {
    const override = "C".repeat(87);
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", override);
    const { publicEnv } = await import("./public");
    expect(publicEnv.vapidPublicKey).toBe(override);
  });
});
