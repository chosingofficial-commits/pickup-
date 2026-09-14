import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";
import { toggleRiderOnlineAction } from "@/lib/actions/rider";
import { IncomingDeliveryAlert } from "@/components/rider/incoming-delivery-alert";
import { db } from "@/lib/db";

const NAV = [
  { href: "/rider", label: "Available" },
  { href: "/rider/deliveries", label: "My deliveries" },
  { href: "/rider/history", label: "History" },
];

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rider");
  if (user.role !== "RIDER") redirect("/");
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

  return (
    <div className="min-h-screen bg-brand-bg pb-16">
      <IncomingDeliveryAlert isOnline={rider?.isOnline ?? false} />
      <header className="border-b border-border-brand bg-white">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
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
            <form action={toggleRiderOnlineAction}>
              <input type="hidden" name="isOnline" value={rider?.isOnline ? "0" : "1"} />
              <button
                type="submit"
                className={`rounded-control px-3.5 py-2 text-sm font-semibold ${
                  rider?.isOnline ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark"
                }`}
              >
                {rider?.isOnline ? "Online" : "Offline"}
              </button>
            </form>
            <form action={logoutAction}>
              <button type="submit" className="rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg">
                Log out
              </button>
            </form>
          </div>
        </Container>
      </header>
      <Container className="py-6">{children}</Container>
    </div>
  );
}
