import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { mainDomainHome } from "@/lib/auth/section-redirect";
import { logoutAction } from "@/lib/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const storefrontHref = await mainDomainHome();
  if (user.role !== "ADMIN") redirect(storefrontHref);

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-border-brand bg-white">
        <Container className="flex items-center justify-between py-3">
          <Link href="/admin">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {/* A plain <a>, not <Link> — this can be a different origin (the
                main domain, from the admin subdomain), and must always be a
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
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AdminNav />
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </div>
  );
}
