import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { AdRequestPanel } from "@/components/advertise/ad-request-panel";
import { getActiveAdPlacementOptions } from "@/lib/ads/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Advertise on Pick Up" };

export default async function AdvertisePage() {
  const [user, placementOptions] = await Promise.all([getCurrentUser(), getActiveAdPlacementOptions()]);

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Promote your business on Pick Up</h1>
        <p className="relative z-0 mb-2 mt-1 text-sm text-gray-600">
          Reach customers across Khagrachari Sadar with a featured ad card on our homepage or marketplace. Every ad is
          reviewed for content and requires payment before it goes live — submitting a request doesn&apos;t publish it
          automatically.
        </p>

        <AdRequestPanel
          placementOptions={placementOptions}
          loginHref="/login?next=/advertise"
          defaults={user ? { phone: user.phone ?? "" } : undefined}
        />
      </div>
    </Container>
  );
}
