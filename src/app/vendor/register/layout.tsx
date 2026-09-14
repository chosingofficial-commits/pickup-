import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

export default function VendorRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-border-brand bg-white">
        <Container className="flex items-center justify-between py-3">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="text-sm font-medium text-brand-dark hover:text-brand-primary">
            Back to Pick Up
          </Link>
        </Container>
      </header>
      <Container className="py-8">{children}</Container>
    </div>
  );
}
