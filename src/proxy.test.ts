// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// publicEnv.appUrl (used by proxy.ts's appUrl()) is a module-level constant
// computed once from process.env at import time — same singleton pattern as
// serverEnv (see src/lib/env/server.test.ts) — so each test stubs env vars
// and then resets modules + re-imports proxy.ts fresh, rather than mutating
// process.env after an earlier import already froze the value.
//
// Every test also explicitly stubs ENABLE_SUBDOMAIN_ROUTING, even when the
// scenario is "treat it as unset" (stubbed to "", vitest has no way to
// stub a var back to genuinely absent) — the real local .env this test
// suite runs against sets ENABLE_SUBDOMAIN_ROUTING=false for local dev
// (loaded once via `dotenv/config` in vitest.setup.ts), and leaving it
// un-stubbed would silently inherit that "false", which is itself a valid
// value (the explicit override) and would incorrectly force routing off
// in every "auto-detect" test below.
async function freshProxy() {
  vi.resetModules();
  const { proxy } = await import("./proxy");
  return proxy;
}

// proxy.ts's rewrite path builds the target as `new URL(path, request.url)`
// — same-origin by construction, so it always preserves whatever protocol
// the actual incoming request used. Real local dev traffic arrives over
// plain HTTP, so requests built for a *.localhost host use "http" here to
// match — using "https" for those would make the rewrite assertions below
// fail not because of a routing bug, but because the test itself claimed a
// TLS request that local dev never actually sends.
function request(host: string, path: string) {
  const protocol = host.includes("localhost") ? "http" : "https";
  return new NextRequest(`${protocol}://${host}${path}`, { headers: { host } });
}

describe("proxy — production hosts (auto-detected, no env var needed)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("pickupn.com / renders the customer homepage as-is (no redirect/rewrite)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("pickupn.com", "/"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("pickupn.com/vendor/register redirects to vendor.pickupn.com/register", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("pickupn.com", "/vendor/register"));
    expect(res.headers.get("location")).toBe("https://vendor.pickupn.com/register");
  });

  it("pickupn.com/rider/register redirects to rider.pickupn.com/register", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("pickupn.com", "/rider/register"));
    expect(res.headers.get("location")).toBe("https://rider.pickupn.com/register");
  });

  it("vendor.pickupn.com/ rewrites to this section's own dashboard route", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("vendor.pickupn.com", "/"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://vendor.pickupn.com/vendor");
  });

  it("vendor.pickupn.com/login renders that subdomain's own login page (no redirect)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("vendor.pickupn.com", "/login"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("vendor.pickupn.com/cart (a customer-only page) redirects back to the main domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("vendor.pickupn.com", "/cart"));
    expect(res.headers.get("location")).toBe("https://pickupn.com/cart");
  });

  it("rider.pickupn.com/ rewrites to this section's own dashboard route", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("rider.pickupn.com", "/"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://rider.pickupn.com/rider");
  });

  it("admin.pickupn.com/ rewrites to this section's own dashboard route", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("admin.pickupn.com", "/"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://admin.pickupn.com/admin");
  });

  it("www.pickupn.com / renders the customer homepage, same as the bare domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("www.pickupn.com", "/"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("www.pickupn.com/vendor/register redirects to vendor.pickupn.com/register too", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("www.pickupn.com", "/vendor/register"));
    expect(res.headers.get("location")).toBe("https://vendor.pickupn.com/register");
  });

  it("auto-detection works even when ENABLE_SUBDOMAIN_ROUTING is completely unset (the actual production bug being fixed)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("vendor.pickupn.com", "/"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://vendor.pickupn.com/vendor");
  });
});

describe("proxy — ENABLE_SUBDOMAIN_ROUTING=false is an unconditional override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("forces routing off even on the real production domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "false");
    const proxy = await freshProxy();
    const res = proxy(request("vendor.pickupn.com", "/"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("proxy — non-production hosts fall back to the env var exactly as before", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("an unrelated host with the env var unset: routing stays off", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pickupn.com");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("example.com", "/vendor/register"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("local dev: admin.localhost:3000 with ENABLE_SUBDOMAIN_ROUTING unset stays off (current behavior preserved)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "");
    const proxy = await freshProxy();
    const res = proxy(request("admin.localhost:3000", "/"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("local dev: admin.localhost:3000 with ENABLE_SUBDOMAIN_ROUTING=true still opts in (current behavior preserved)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("ENABLE_SUBDOMAIN_ROUTING", "true");
    const proxy = await freshProxy();
    const res = proxy(request("admin.localhost:3000", "/"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://admin.localhost:3000/admin");
  });
});
