import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { isTobaccoModuleEnabled } from "@/lib/tobacco/queries";

export async function Footer() {
  const [{ dict }, settings, tobaccoEnabled] = await Promise.all([getDictionary(), getSiteSettings(), isTobaccoModuleEnabled()]);
  const year = new Date().getFullYear();

  const columns = [
    {
      title: "Pick Up",
      links: [
        { href: "/about", label: dict.footer.about },
        { href: "/contact", label: dict.footer.contact },
        { href: "/faq", label: dict.footer.faq },
        { href: "/support", label: dict.footer.support },
      ],
    },
    {
      title: "Categories",
      links: [
        { href: "/marketplace?category=groceries", label: dict.nav.groceries },
        { href: "/restaurants", label: dict.nav.restaurants },
        { href: "/marketplace?category=everyday-essentials", label: dict.nav.essentials },
        { href: "/marketplace?category=household-products", label: dict.nav.household },
        { href: "/marketplace?category=personal-care", label: dict.nav.personalCare },
      ],
    },
    {
      title: "Partner with us",
      links: [
        { href: "/vendor/register", label: dict.footer.forVendors },
        { href: "/rider/register", label: dict.footer.forRiders },
        { href: "/advertise", label: "Advertise on Pick Up" },
      ],
    },
    {
      title: dict.footer.legal,
      links: [
        { href: "/legal/terms", label: dict.footer.terms },
        { href: "/legal/privacy", label: dict.footer.privacy },
        ...(tobaccoEnabled ? [{ href: "/cigarettes", label: "Age-restricted products (18+)" }] : []),
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-border-brand bg-brand-dark text-white">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo className="[&_span]:text-white" />
          <p className="mt-3 max-w-xs text-sm text-white/70">{dict.brand.tagline}</p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <a href={`tel:${settings[SITE_SETTING_KEYS.supportPhone]}`} className="hover:text-white">
                {settings[SITE_SETTING_KEYS.supportPhone]}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <a href={`mailto:${settings[SITE_SETTING_KEYS.supportEmail]}`} className="hover:text-white">
                {settings[SITE_SETTING_KEYS.supportEmail]}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{settings[SITE_SETTING_KEYS.supportAddress]}</span>
            </li>
          </ul>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white/60">{col.title}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false} className="text-white/85 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-white/10 py-4">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-white/60 sm:flex-row">
          <p>
            © {year} Pick Up. {dict.footer.rights}
          </p>
          <p>Khagrachari Sadar, Bangladesh · Prices shown in BDT (Tk)</p>
        </Container>
      </div>
    </footer>
  );
}
