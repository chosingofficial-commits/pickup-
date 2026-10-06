import Link from "next/link";
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
        <Container className="flex items-center justify-between py-3">
          <Link href={homeHref}>
            <Logo />
          </Link>
          <Link href={homeHref} className="text-sm font-medium text-brand-dark hover:text-brand-primary">
            Back to Pick Up
          </Link>
        </Container>
      </header>
      <Container className="py-8">{children}</Container>
    </div>
  );
}
