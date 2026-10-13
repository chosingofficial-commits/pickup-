import { describe, it, expect } from "vitest";
import { productionRootDomain, isProductionHost, isSubdomainRoutingEnabled } from "./subdomains";

describe("productionRootDomain", () => {
  it("uses NEXT_PUBLIC_APP_URL's hostname when it's a real domain", () => {
    expect(productionRootDomain("https://pickupn.com")).toBe("pickupn.com");
  });

  it("falls back to the hardcoded domain when NEXT_PUBLIC_APP_URL is unset", () => {
    expect(productionRootDomain(undefined)).toBe("pickupn.com");
  });

  it("falls back to the hardcoded domain when NEXT_PUBLIC_APP_URL is the local-dev default (never treats localhost as production)", () => {
    expect(productionRootDomain("http://localhost:3000")).toBe("pickupn.com");
  });

  it("falls back to the hardcoded domain when NEXT_PUBLIC_APP_URL isn't a valid URL", () => {
    expect(productionRootDomain("not a url")).toBe("pickupn.com");
  });
});

describe("isProductionHost", () => {
  const appUrl = "https://pickupn.com";

  it("matches the bare root domain", () => {
    expect(isProductionHost("pickupn.com", appUrl)).toBe(true);
  });

  it("matches vendor/rider/admin/www subdomains", () => {
    expect(isProductionHost("vendor.pickupn.com", appUrl)).toBe(true);
    expect(isProductionHost("rider.pickupn.com", appUrl)).toBe(true);
    expect(isProductionHost("admin.pickupn.com", appUrl)).toBe(true);
    expect(isProductionHost("www.pickupn.com", appUrl)).toBe(true);
  });

  it("still matches via the hardcoded fallback when NEXT_PUBLIC_APP_URL is unset", () => {
    expect(isProductionHost("vendor.pickupn.com", undefined)).toBe(true);
  });

  it("rejects a lookalike host — never a substring match", () => {
    expect(isProductionHost("pickupn.com.evil.com", appUrl)).toBe(false);
    expect(isProductionHost("notpickupn.com", appUrl)).toBe(false);
    expect(isProductionHost("evilpickupn.com", appUrl)).toBe(false);
  });

  it("rejects an unknown subdomain", () => {
    expect(isProductionHost("staging.pickupn.com", appUrl)).toBe(false);
  });

  it("rejects local dev hosts", () => {
    expect(isProductionHost("admin.localhost:3000", appUrl)).toBe(false);
    expect(isProductionHost("localhost:3000", appUrl)).toBe(false);
  });

  it("rejects a null/missing host", () => {
    expect(isProductionHost(null, appUrl)).toBe(false);
    expect(isProductionHost(undefined, appUrl)).toBe(false);
  });
});

describe("isSubdomainRoutingEnabled", () => {
  const appUrl = "https://pickupn.com";

  it("auto-enables on a production host even when the env var is completely unset", () => {
    expect(isSubdomainRoutingEnabled("vendor.pickupn.com", appUrl, undefined)).toBe(true);
  });

  it("ENABLE_SUBDOMAIN_ROUTING=false overrides and disables it even on a production host", () => {
    expect(isSubdomainRoutingEnabled("vendor.pickupn.com", appUrl, "false")).toBe(false);
  });

  it("ENABLE_SUBDOMAIN_ROUTING=true on a production host is simply redundant with auto-detection (still on)", () => {
    expect(isSubdomainRoutingEnabled("vendor.pickupn.com", appUrl, "true")).toBe(true);
  });

  it("a non-production host with the env var unset stays off", () => {
    expect(isSubdomainRoutingEnabled("admin.localhost:3000", "http://localhost:3000", undefined)).toBe(false);
  });

  it("a non-production host still opts in via ENABLE_SUBDOMAIN_ROUTING=true (local dev, unchanged)", () => {
    expect(isSubdomainRoutingEnabled("admin.localhost:3000", "http://localhost:3000", "true")).toBe(true);
  });

  it("a non-production host with ENABLE_SUBDOMAIN_ROUTING=false stays off", () => {
    expect(isSubdomainRoutingEnabled("admin.localhost:3000", "http://localhost:3000", "false")).toBe(false);
  });
});
