import type { Metadata } from "next";
import { AdRequestPanel } from "@/components/advertise/ad-request-panel";
import { getActiveAdPlacementOptions } from "@/lib/ads/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Create a new ad" };

export default async function VendorNewAdPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const [vendor, placementOptions] = await Promise.all([
    db.vendor.findUnique({ where: { id: user.vendorProfile.id }, select: { businessName: true, phone: true } }),
    getActiveAdPlacementOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-1">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Promote your business on Pick Up</h1>
      <p className="relative z-0 mb-2 text-sm text-gray-600">
        Reach customers across Khagrachari Sadar with a featured ad card on our homepage or marketplace. Every ad is
        reviewed for content and requires payment before it goes live — submitting a request doesn&apos;t publish it
        automatically.
      </p>

      <AdRequestPanel
        placementOptions={placementOptions}
        defaults={{ phone: vendor?.phone ?? user.phone ?? "", businessName: vendor?.businessName ?? "" }}
      />
    </div>
  );
}
