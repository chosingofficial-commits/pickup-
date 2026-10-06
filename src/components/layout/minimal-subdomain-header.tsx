import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import type { Section } from "@/lib/subdomains";

/**
 * Header for the handful of account/advertise pages that render on the
 * vendor/rider subdomains (same page, same subdomain session — see
 * (storefront)/layout.tsx and src/proxy.ts's SHARED_PATHS pass-through).
 * Deliberately has none of the customer Header's cart/wishlist/search chrome
 * — those don't apply on a vendor/rider subdomain. "/" is relative on
 * purpose: it stays on this subdomain and rewrites to that section's own
 * dashboard home.
 */
export function MinimalSubdomainHeader({ section }: { section: Section }) {
  return (
    <header className="border-b border-border-brand bg-white">
      <Container className="flex items-center justify-between py-3">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <Link href="/" className="text-sm font-medium text-brand-dark hover:text-brand-primary">
          ← Back to {section === "vendor" ? "dashboard" : "deliveries"}
        </Link>
      </Container>
    </header>
  );
}
