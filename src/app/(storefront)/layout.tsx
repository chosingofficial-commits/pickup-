import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/role-home";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
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
