import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Container } from "@/components/ui/container";
import { AccountNav } from "@/components/account/account-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  // Admins have their own dashboard at /admin; vendors and riders have their
  // own dashboards too, which now include everything this section offers
  // them (Profile, My ads, Notifications, Support, Password & security) —
  // see /vendor/profile, /vendor/notifications, /vendor/support and their
  // /rider equivalents. This section is customers-only.
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "VENDOR") redirect("/vendor/profile");
  if (user.role === "RIDER") redirect("/rider/profile");

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
