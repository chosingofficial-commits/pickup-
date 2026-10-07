import type { Metadata } from "next";
import { MyAdsList } from "@/components/ads/my-ads-list";
import { getMyAdsData } from "@/lib/ads/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My ads" };

export default async function MyAdsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getMyAdsData(user.id);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">My ads</h1>
      <MyAdsList {...data} newAdHref="/advertise" />
    </div>
  );
}
