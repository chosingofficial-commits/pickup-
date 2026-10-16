import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Regression coverage for a real production bug: a VENDOR/RIDER/ADMIN
 * account (which can place orders as a customer the same as anyone else —
 * see src/lib/orders/access.ts) clicked "Account" on pickupn.com and got
 * stuck. The cause: account/layout.tsx used to redirect() those roles to
 * "/admin", "/vendor/profile" or "/rider/profile" — a bare relative path,
 * which proxy.ts then redirected again to a DIFFERENT real subdomain
 * (vendor.pickupn.com etc.), where this pickupn.com-scoped session cookie
 * was never valid, landing on that subdomain's own login page instead.
 * This bug has no React Server Component test harness to render against
 * (no precedent for it anywhere in this codebase), so — same as
 * src/proxy.test.ts's matcher-regex test, which has the identical
 * constraint — this asserts directly against the source for the exact
 * patterns that caused it, in account/layout.tsx and every file that
 * computes the storefront "Account" link.
 */
describe("account pages are reachable by every role on the main domain", () => {
  it("account/layout.tsx no longer redirects ADMIN/VENDOR/RIDER away from /account", () => {
    const source = readFileSync(path.join(here, "layout.tsx"), "utf8");
    expect(source).not.toMatch(/redirect\(["']\/admin["']\)/);
    expect(source).not.toMatch(/redirect\(["']\/vendor\/profile["']\)/);
    expect(source).not.toMatch(/redirect\(["']\/rider\/profile["']\)/);
  });

  // Checks the import, not just the word "roleHome" — both files'
  // explanatory comments legitimately mention it by name as prose,
  // describing the bug that was fixed.
  it("the storefront header's Account link is never role-dependent", () => {
    const source = readFileSync(path.join(here, "../../../components/layout/header.tsx"), "utf8");
    expect(source).not.toMatch(/from "@\/lib\/auth\/role-home"/);
    expect(source).toMatch(/accountHref = user \? "\/account" : "\/login"/);
  });

  it("the storefront layout's mobile-nav Account link is never role-dependent", () => {
    const source = readFileSync(path.join(here, "../layout.tsx"), "utf8");
    expect(source).not.toMatch(/from "@\/lib\/auth\/role-home"/);
    expect(source).toMatch(/accountHref = user \? "\/account" : "\/login"/);
  });
});
