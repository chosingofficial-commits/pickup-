import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { VendorNav } from "@/components/vendor-dashboard/vendor-nav";
import { IncomingOrderAlert } from "@/components/vendor-dashboard/incoming-order-alert";
import { getCurrentUser } from "@/lib/auth/session";
import { mainDomainHome } from "@/lib/auth/section-redirect";
import { logoutAction } from "@/lib/actions/auth";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/vendor");
  const storefrontHref = await mainDomainHome();
  if (user.role !== "VENDOR") redirect(storefrontHref);

  if (!user.vendorProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-bg px-4 text-center">
        <Logo />
        <h1 className="font-heading text-xl font-bold text-brand-dark">No business registered yet</h1>
        <p className="max-w-sm text-sm text-gray-600">Submit a vendor application to start selling on Pick Up.</p>
        <Link href="/vendor/register" className="rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          Register your business
        </Link>
      </div>
    );
  }

  if (user.vendorProfile.isSuspended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-bg px-4 text-center">
        <Logo />
        <h1 className="font-heading text-xl font-bold text-brand-dark">Account suspended</h1>
        <p className="max-w-sm text-sm text-gray-600">Your vendor account has been temporarily suspended. Contact support for details.</p>
        <Link href="/account/support" className="rounded-control bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          Contact support
        </Link>
      </div>
    );
  }

  if (!user.vendorProfile.isApproved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-bg px-4 text-center">
        <Logo />
        <h1 className="font-heading text-xl font-bold text-brand-dark">Application under review</h1>
        <p className="max-w-sm text-sm text-gray-600">We&apos;re still reviewing your application. We&apos;ll notify you once it&apos;s approved.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <IncomingOrderAlert businessType={user.vendorProfile.businessType} />
      <header className="border-b border-border-brand bg-white">
        <Container className="flex items-center justify-between py-3">
          <Link href="/vendor">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {/* A plain <a>, not <Link> — this can be a different origin (the
                main domain, from a vendor subdomain), and must always be a
                real full-page navigation, never a same-origin client-side
                soft nav. */}
            <a href={storefrontHref} className="text-sm font-medium text-brand-dark hover:text-brand-primary">
              View storefront
            </a>
            <form action={logoutAction}>
              <button type="submit" className="rounded-control px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand-bg">
                Log out
              </button>
            </form>
          </div>
        </Container>
      </header>
      <Container className="py-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <VendorNav businessType={user.vendorProfile.businessType} />
          <div>{children}</div>
        </div>
      </Container>
    </div>
  );
}
