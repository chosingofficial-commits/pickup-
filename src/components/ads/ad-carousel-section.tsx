import { getActiveCampaignsForPlacement, recordAdImpression } from "@/lib/ads/queries";
import { AdCarousel } from "./ad-carousel";
import type { AdPlacementCode } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

/**
 * Renders nothing (no wrapper, no gap) when there are no active campaigns —
 * the whole point of a placement-keyed section is that it must never leave
 * an empty hole in the page layout.
 */
export async function AdCarouselSection({ placementCode, className }: { placementCode: AdPlacementCode; className?: string }) {
  const campaigns = await getActiveCampaignsForPlacement(placementCode);
  if (campaigns.length === 0) return null;

  await Promise.all(campaigns.map((c) => recordAdImpression(c.id)));

  const items = campaigns
    .filter((c) => c.advertisement.bannerImageUrl)
    .map((c) => ({
      id: c.id,
      title: c.advertisement.title,
      imageUrl: c.advertisement.bannerImageUrl!,
      advertiserName: c.advertisement.advertiser.businessName,
    }));

  if (items.length === 0) return null;

  return (
    <div className={cn("mx-4 sm:mx-6 lg:mx-8", className)}>
      <AdCarousel items={items} />
    </div>
  );
}
