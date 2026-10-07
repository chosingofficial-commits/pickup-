import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { mainDomainHome } from "@/lib/auth/section-redirect";

export default async function VendorRegisterLayout({ children }: { children: React.ReactNode }) {
  // Absolute on the vendor subdomain — a relative "/" would rewrite straight
  // back into the vendor dashboard (see proxy.ts), not the real homepage.
  const homeHref = await mainDomainHome();

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-border-brand bg-white">
        {/* Plain <a>s, not <Link> — homeHref can be a different origin (the
            main domain, from the vendor subdomain), and must always be a
            real full-page navigation, never a same-origin client-side soft nav. */}
        <Container className="flex items-center justify-between py-3">
          <a href={homeHref}>
            <Logo />
          </a>
          <a href={homeHref} className="text-sm font-medium text-brand-dark hover:text-brand-primary">
            Back to Pick Up
          </a>
        </Container>
      </header>
      <Container className="py-8">{children}</Container>
    </div>
  );
}
