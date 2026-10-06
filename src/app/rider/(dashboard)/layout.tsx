import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/session";
import { mainDomainHome } from "@/lib/auth/section-redirect";
import { logoutAction } from "@/lib/actions/auth";
import { toggleRiderOnlineAction } from "@/lib/actions/rider";
import { IncomingDeliveryAlert } from "@/components/rider/incoming-delivery-alert";
import { RiderBottomNav } from "@/components/rider/rider-bottom-nav";
import { RiderMoreMenu } from "@/components/rider/rider-more-menu";
import { db } from "@/lib/db";

const NAV = [
  { href: "/rider", label: "Available" },
  { href: "/rider/deliveries", label: "My deliveries" },
  { href: "/rider/history", label: "History" },
  { href: "/account", label: "Profile" },
  { href: "/account/ads", label: "My ads" },
];

function OnlineToggle({ isOnline, className }: { isOnline: boolean; className?: string }) {
  return (
    <form action={toggleRiderOnlineAction}>
      <input type="hidden" name="isOnline" value={isOnline ? "0" : "1"} />
      <button
        type="submit"
        className={`rounded-control text-sm font-semibold ${className ?? "px-3.5 py-2"} ${
          isOnline ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark"
        }`}
      >
        {isOnline ? "Online" : "Offline"}
      </button>
    </form>
  );
}

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rider");
  if (user.role !== "RIDER") redirect(await mainDomainHome());
  if (!user.riderProfile) redirect("/rider/register");

  if (!user.riderProfile.isApproved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-bg px-4 text-center">
        <Logo />
        <h1 className="font-heading text-xl font-bold text-brand-dark">Application under review</h1>
        <p className="max-w-sm text-sm text-gray-600">We&apos;re verifying your details. You&apos;ll be able to accept deliveries once approved.</p>
      </div>
    );
  }

  const rider = await db.riderProfile.findUnique({ where: { id: user.riderProfile.id } });
  const isOnline = rider?.isOnline ?? false;

  return (
    // Riders get their own header/nav entirely — never the customer storefront
    // chrome (Header/MobileNav), even though /account (Profile, My ads) is
    // also reachable from here. Bottom padding on mobile only, to clear
    // RiderBottomNav; desktop has no fixed bottom bar.
    <div className="min-h-screen bg-brand-bg pb-20 md:pb-0">
      <IncomingDeliveryAlert isOnline={isOnline} />
      <header className="border-b border-border-brand bg-white">
        {/* Mobile (<md): logo, Online/Offline (always visible), and a single
            "more" menu for Profile/My ads/Log out — entirely separate markup
            from desktop below, so desktop can't regress from anything here. */}
        <Container className="flex items-center justify-between gap-2 py-2.5 md:hidden">
          <Link href="/rider" className="flex h-11 w-11 shrink-0 items-center justify-center">
            <Logo size="sm" iconOnly />
          </Link>
          <div className="flex items-center gap-1.5">
            <OnlineToggle isOnline={isOnline} className="px-3 py-2 text-xs" />
            <RiderMoreMenu />
          </div>
        </Container>

        {/* Desktop (>=md): unchanged layout — full nav, logo with text, separate Log out. */}
        <Container className="hidden flex-wrap items-center justify-between gap-3 py-3 md:flex">
          <Link href="/rider">
            <Logo />
          </Link>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <OnlineToggle isOnline={isOnline} />
            <form action={logoutAction}>
              <button type="submit" className="rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg">
                Log out
              </button>
            </form>
          </div>
        </Container>
      </header>
      <Container className="py-6">{children}</Container>
      <RiderBottomNav />
    </div>
  );
}
