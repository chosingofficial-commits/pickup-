import type { Metadata } from "next";
import { AdRequestPanel } from "@/components/advertise/ad-request-panel";
import { getActiveAdPlacementOptions } from "@/lib/ads/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create a new ad" };

export default async function RiderNewAdPage() {
  const user = await getCurrentUser();
  if (!user?.riderProfile) return null;

  const placementOptions = await getActiveAdPlacementOptions();

  return (
    <div className="mx-auto max-w-4xl space-y-1">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Promote on Pick Up</h1>
      <p className="relative z-0 mb-2 text-sm text-gray-600">
        Reach customers across Khagrachari Sadar with a featured ad card on our homepage or marketplace. Every ad is
        reviewed for content and requires payment before it goes live — submitting a request doesn&apos;t publish it
        automatically.
      </p>

      <AdRequestPanel placementOptions={placementOptions} defaults={{ phone: user.phone ?? "" }} />
    </div>
  );
}
