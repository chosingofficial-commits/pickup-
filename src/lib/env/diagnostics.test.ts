import { describe, it, expect, afterEach, vi } from "vitest";

describe("getMissingRequiredVars", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lists a required var that's blank the same as one that's fully unset", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("DATABASE_POOL_URL", "   ");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("S3_ENDPOINT", "https://example.supabase.co/storage/v1/s3");
    vi.stubEnv("S3_PUBLIC_URL_BASE", "https://example.supabase.co/storage/v1/object/public");
    vi.stubEnv("S3_ACCESS_KEY_ID", "key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("WEB_PUSH_SECRET", "a".repeat(43));
    const { getMissingRequiredVars } = await import("./diagnostics");
    expect(getMissingRequiredVars()).toEqual(["DATABASE_POOL_URL"]);
  });

  it("reports none missing when every required var is set and non-blank", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("DATABASE_POOL_URL", "postgresql://y");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("S3_ENDPOINT", "https://example.supabase.co/storage/v1/s3");
    vi.stubEnv("S3_PUBLIC_URL_BASE", "https://example.supabase.co/storage/v1/object/public");
    vi.stubEnv("S3_ACCESS_KEY_ID", "key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("WEB_PUSH_SECRET", "a".repeat(43));
    const { getMissingRequiredVars } = await import("./diagnostics");
    expect(getMissingRequiredVars()).toEqual([]);
  });
});

describe("getEnvFilesOnServer", () => {
  it("never throws even if the directory can't be read", async () => {
    const { getEnvFilesOnServer } = await import("./diagnostics");
    expect(() => getEnvFilesOnServer()).not.toThrow();
  });
});
