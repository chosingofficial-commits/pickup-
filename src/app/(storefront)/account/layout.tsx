import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Container } from "@/components/ui/container";
import { AccountNav } from "@/components/account/account-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  // Deliberately NOT role-gated. This used to redirect ADMIN/VENDOR/RIDER
  // accounts to /admin, /vendor/profile or /rider/profile instead — correct
  // back when those dashboards rendered directly on this same domain (pre
  // subdomain-routing), but now that vendor./rider./admin.pickupn.com are
  // real separate origins with their own host-only session cookie, a
  // relative redirect() to "/vendor/profile" sent the browser through
  // proxy.ts to vendor.pickupn.com — where this pickupn.com-scoped session
  // was never valid, landing on that subdomain's login screen instead of
  // this page. A vendor/rider account can place orders as a customer the
  // same as anyone else (see src/lib/orders/access.ts's canViewOrderGroup)
  // and this page is already role-agnostic (just this User row's own
  // name/email/phone, orders, addresses, etc. — never a CustomerProfile
  // precondition), so there's no actual reason to bounce them elsewhere.
  return (
    <Container className="py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div>{children}</div>
      </div>

      {/* Separate from the nav tabs on purpose — a distinct exit action, not
          another destination to browse to, and reachable at the bottom of
          every account page without hunting through the tab row on mobile. */}
      <div className="mt-8 border-t border-border-brand pt-6">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex min-h-11 items-center gap-2 rounded-control border border-border-brand px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </button>
        </form>
      </div>
    </Container>
  );
}
