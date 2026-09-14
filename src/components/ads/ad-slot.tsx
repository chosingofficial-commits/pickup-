import { getActiveCampaignForPlacement, recordAdImpression } from "@/lib/ads/queries";
import { ProductImage } from "@/components/product/product-image";
import type { AdPlacementCode } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

/**
 * Renders nothing when no campaign is active for this placement, so
 * paid-ad slots never slow the page down or leave visible dead space.
 */
export async function AdSlot({
  code,
  className,
  aspect = "aspect-[3/1]",
  variant = "banner",
}: {
  code: AdPlacementCode;
  className?: string;
  aspect?: string;
  variant?: "banner" | "card";
}) {
  const campaign = await getActiveCampaignForPlacement(code);
  if (!campaign) return null;

  await recordAdImpression(campaign.id);

  const { advertisement } = campaign;

  return (
    <div className={cn("overflow-hidden rounded-card border border-border-brand bg-white shadow-soft", className)}>
      <a href={`/go/ad/${campaign.id}`} className="group relative block">
        <span className="absolute left-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {variant === "card" ? "Sponsored" : "Advertisement"}
        </span>
        <ProductImage
          src={advertisement.bannerImageUrl}
          alt={advertisement.title}
          className={cn("w-full transition-opacity group-hover:opacity-90", aspect)}
          emoji="📣"
        />
        {variant === "card" && (
          <div className="p-3">
            <p className="line-clamp-1 text-sm font-semibold text-brand-dark">{advertisement.title}</p>
            <p className="line-clamp-1 text-xs text-gray-500">{advertisement.advertiser.businessName}</p>
          </div>
        )}
      </a>
    </div>
  );
}
