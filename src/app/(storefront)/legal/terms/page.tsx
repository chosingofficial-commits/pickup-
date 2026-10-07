import type { Metadata } from "next";
import { Section } from "@/components/ui/container";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { TermsEn, TermsBn } from "@/lib/legal/terms-content";

export const metadata: Metadata = { title: "Terms of service" };

export default async function TermsPage() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const showAdminBanner = user?.role === "ADMIN";

  return (
    <Section title={locale === "bn" ? "সেবার শর্তাবলী" : "Terms of service"}>
      <div className="prose mx-auto max-w-2xl text-sm text-gray-700">
        {locale === "bn" ? <TermsBn showAdminBanner={showAdminBanner} /> : <TermsEn showAdminBanner={showAdminBanner} />}
      </div>
    </Section>
  );
}
