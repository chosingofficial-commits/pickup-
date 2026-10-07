import type { Metadata } from "next";
import { Section } from "@/components/ui/container";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { PrivacyEn, PrivacyBn } from "@/lib/legal/privacy-content";

export const metadata: Metadata = { title: "Privacy policy" };

export default async function PrivacyPage() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  const showAdminBanner = user?.role === "ADMIN";

  return (
    <Section title={locale === "bn" ? "গোপনীয়তা নীতি" : "Privacy policy"}>
      <div className="prose mx-auto max-w-2xl text-sm text-gray-700">
        {locale === "bn" ? <PrivacyBn showAdminBanner={showAdminBanner} /> : <PrivacyEn showAdminBanner={showAdminBanner} />}
      </div>
    </Section>
  );
}
