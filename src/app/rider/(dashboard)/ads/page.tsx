import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MyAdsList } from "@/components/ads/my-ads-list";
import { getMyAdsData } from "@/lib/ads/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My ads" };

export default async function RiderAdsPage() {
  const user = await getCurrentUser();
  if (!user?.riderProfile) return null;

  const data = await getMyAdsData(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">My ads</h1>
        <Link
          href="/rider/ads/new"
          className="flex items-center gap-1.5 rounded-control bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create new ad
        </Link>
      </div>
      <MyAdsList {...data} newAdHref="/rider/ads/new" />
    </div>
  );
}
