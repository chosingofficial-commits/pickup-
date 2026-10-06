import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { mainDomainHome } from "@/lib/auth/section-redirect";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Absolute on a vendor/rider subdomain — a relative "/" would rewrite
  // straight into that section's own dashboard home (see proxy.ts), not the
  // real homepage. /login and /register themselves are shared, host-agnostic
  // pages (see SHARED_PATHS / proxy.ts's explicit "/login" pass-through).
  const homeHref = await mainDomainHome();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4 py-12">
      <Link href={homeHref} className="mb-8">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-md rounded-card border border-border-brand bg-white p-6 shadow-lifted sm:p-8">
        {children}
      </div>
    </div>
  );
}
