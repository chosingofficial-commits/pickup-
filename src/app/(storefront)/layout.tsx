import { headers } from "next/headers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MinimalSubdomainHeader } from "@/components/layout/minimal-subdomain-header";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/role-home";
import { sectionFromHost } from "@/lib/subdomains";
import { publicEnv } from "@/lib/env/public";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  // Deliberately reads process.env directly, same as src/proxy.ts — this
  // layout shouldn't ever be coupled to an unrelated env var failing the
  // full serverEnv schema.
  const subdomainRoutingEnabled = process.env.ENABLE_SUBDOMAIN_ROUTING === "true";
  const host = (await headers()).get("host");
  const section = subdomainRoutingEnabled ? sectionFromHost(host, publicEnv.appUrl) : null;

  // On a vendor/rider subdomain, only the shared account/advertise pages
  // reach this layout (everything else is routed to that section's own
  // dashboard tree by proxy.ts) — give them minimal chrome, never the
  // customer storefront's cart/wishlist/search header.
  if (section === "vendor" || section === "rider") {
    return (
      <>
        <MinimalSubdomainHeader section={section} />
        <main className="flex-1">{children}</main>
      </>
    );
  }

  const user = await getCurrentUser();
  const accountHref = user ? roleHome(user.role) : "/login";

  return (
    <>
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileNav accountHref={accountHref} />
      <WhatsAppButton />
    </>
  );
}
