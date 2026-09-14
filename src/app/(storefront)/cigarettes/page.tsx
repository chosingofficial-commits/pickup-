import type { Metadata } from "next";
import { Section } from "@/components/ui/container";
import { CigaretteSection } from "@/components/tobacco/age-gate";
import { getCigaretteProducts, getTobaccoSettings, isTobaccoModuleEnabled } from "@/lib/tobacco/queries";

export const metadata: Metadata = {
  title: "Age-restricted products",
  robots: { index: false, follow: false },
};

export default async function CigarettesPage() {
  const enabled = await isTobaccoModuleEnabled();

  if (!enabled) {
    return (
      <Section title="Age-restricted products">
        <p className="text-sm text-gray-600">This section is not available right now.</p>
      </Section>
    );
  }

  const [settings, products] = await Promise.all([getTobaccoSettings(), getCigaretteProducts()]);

  return (
    <Section title="Cigarettes" subtitle="18+ only. ID may be checked at delivery.">
      <CigaretteSection
        products={products}
        minimumAge={settings.minimumAge}
        healthWarningText={settings.healthWarningText}
      />
    </Section>
  );
}
