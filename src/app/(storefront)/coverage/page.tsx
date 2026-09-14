import type { Metadata } from "next";
import { Section } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { CoverageRequestForm } from "@/components/location/coverage-request-form";
import { getActiveServiceAreaLabel } from "@/lib/location/queries";

export const metadata: Metadata = {
  title: "Delivery coverage",
  description: "Check where Pick Up delivers today and join the waiting list for your area.",
};

export default async function CoveragePage() {
  const areaLabel = await getActiveServiceAreaLabel();

  return (
    <Section
      title="Delivery coverage"
      subtitle={areaLabel ? `Pick Up currently delivers in ${areaLabel}.` : "Pick Up hasn't launched delivery yet."}
    >
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-1 font-heading text-lg font-bold text-brand-dark">Not in our zone yet?</h2>
            <p className="mb-4 text-sm text-gray-600">
              Tell us your area and we&apos;ll notify you the moment Pick Up expands there.
            </p>
            <CoverageRequestForm />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
