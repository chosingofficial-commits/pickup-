import { describe, it, expect, afterEach, vi } from "vitest";

// Regression coverage for a real bug: a plain `??` (or zod's own
// `.default(...)`) only falls back when a var is genuinely absent
// (null/undefined) — a host env-var UI can leave a var present-but-blank
// ("" or whitespace), which neither treats as missing. For STORAGE_PROVIDER
// specifically this was dangerous, not just wrong: z.enum(["local","s3"])
// rejects "" outright, so a blank value would have failed the whole
// serverEnvSchema.safeParse() and thrown "Invalid environment variables"
// at process startup — a full outage, not a silently-wrong default. Each
// test imports the module fresh (vi.resetModules) so it picks up the
// stubbed env.
describe("serverEnv blank-value handling", () => {
  function stubRequired() {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("treats a blank STORAGE_PROVIDER as unset and applies the production default instead of failing to parse", async () => {
    stubRequired();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_PROVIDER", "   ");
    const { serverEnv } = await import("./server");
    expect(serverEnv.STORAGE_PROVIDER).toBe("s3");
  });

  it("keeps the local default in non-production when STORAGE_PROVIDER is blank", async () => {
    stubRequired();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STORAGE_PROVIDER", "");
    const { serverEnv } = await import("./server");
    expect(serverEnv.STORAGE_PROVIDER).toBe("local");
  });

  it("treats a blank S3_REGION as unset and applies the default", async () => {
    stubRequired();
    vi.stubEnv("S3_REGION", "  ");
    const { serverEnv } = await import("./server");
    expect(serverEnv.S3_REGION).toBe("ap-south-1");
  });

  it("treats a blank VAPID_SUBJECT as unset and applies the default", async () => {
    stubRequired();
    vi.stubEnv("VAPID_SUBJECT", "   ");
    const { serverEnv } = await import("./server");
    expect(serverEnv.VAPID_SUBJECT).toBe("mailto:information@pickupn.com");
  });

  it("derives APP_URL from NEXT_PUBLIC_APP_URL when APP_URL is blank", async () => {
    stubRequired();
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    const { serverEnv } = await import("./server");
    expect(serverEnv.APP_URL).toBe("https://pickupn.com");
  });

  it("still uses a real STORAGE_PROVIDER override when one is actually set", async () => {
    stubRequired();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_PROVIDER", "local");
    const { serverEnv } = await import("./server");
    expect(serverEnv.STORAGE_PROVIDER).toBe("local");
  });
});
