import Link from "next/link";
import { Clock, Bike } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { VendorLogo } from "@/components/vendor/vendor-logo";
import { OfferBadge } from "./offer-badge";
import { SHOP_TYPE_LABELS, formatEtaRange } from "@/lib/shops/shop-type";
import type { ShopCardData, ShopWithOffers } from "@/lib/shops/queries";

type EtaInfo = { etaMin?: number; etaMax?: number; deliveryFee?: string; isCovered?: boolean };

/**
 * Popular-shops row item: logo, name, delivery time only (per spec — no
 * cover photo, fee, or offer badges here, those belong to the bigger Deals
 * cards and the All-shops grid).
 */
export function ShopCardCompact({ shop, eta }: { shop: ShopCardData; eta: EtaInfo }) {
  const etaLabel = formatEtaRange(eta.etaMin, eta.etaMax);
  return (
    <Link
      href={`/marketplace/${shop.slug}`}
      prefetch={false}
      className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-1.5 text-center sm:w-32"
    >
      <VendorLogo
        logoUrl={shop.logoUrl}
        coverImageUrl={shop.coverImageUrl}
        businessName={shop.businessName}
        size={64}
        className="text-xl shadow-soft transition-shadow group-hover:shadow-lifted"
      />
      <span className="line-clamp-2 text-xs font-semibold text-brand-dark group-hover:text-brand-primary">{shop.businessName}</span>
      {etaLabel && <span className="text-[11px] text-gray-500">{etaLabel}</span>}
    </Link>
  );
}

function feeLabel(eta: EtaInfo, hasFreeDelivery: boolean): string {
  if (hasFreeDelivery) return "Free delivery";
  if (!eta.isCovered || eta.deliveryFee == null) return "Delivery fee varies";
  const fee = Number(eta.deliveryFee);
  return fee === 0 ? "Free delivery" : `Tk ${fee} delivery`;
}

/** Deals-row item: cover photo, name, delivery time, delivery fee, offer badges. */
export function ShopCardDeal({ shop, eta }: { shop: ShopWithOffers; eta: EtaInfo }) {
  const etaLabel = formatEtaRange(eta.etaMin, eta.etaMax);
  const hasFreeDelivery = shop.offers.some((o) => o.kind === "freeDelivery");
  return (
    <Link
      href={`/marketplace/${shop.slug}`}
      prefetch={false}
      className="group flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-card border border-border-brand bg-white shadow-soft transition-shadow hover:shadow-lifted sm:w-[46%] lg:w-[31%]"
    >
      <div className="relative aspect-[16/9]">
        <ProductImage src={shop.coverImageUrl} alt={shop.businessName} categorySlug="vendor" className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="-mt-7 flex items-end gap-2">
          <VendorLogo logoUrl={shop.logoUrl} coverImageUrl={shop.coverImageUrl} businessName={shop.businessName} size={40} />
        </div>
        <h3 className="truncate font-heading text-base font-bold text-brand-dark group-hover:text-brand-primary">{shop.businessName}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          {etaLabel && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {etaLabel}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bike className="h-3.5 w-3.5" aria-hidden />
            {feeLabel(eta, hasFreeDelivery)}
          </span>
        </div>
        {shop.offers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {shop.offers.map((o) => (
              <OfferBadge key={`${o.kind}-${o.label}`} offer={o} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * All-shops listing item — a vertical card (cover + overlapping logo, like
 * RestaurantCard) at sm: and up, collapsing to a horizontal row (logo on the
 * left, big tap target) below that for the mobile single-column list.
 */
export function ShopCardGrid({ shop, eta }: { shop: ShopWithOffers; eta: EtaInfo }) {
  const etaLabel = formatEtaRange(eta.etaMin, eta.etaMax);
  const hasFreeDelivery = shop.offers.some((o) => o.kind === "freeDelivery");

  return (
    <Link
      href={`/marketplace/${shop.slug}`}
      prefetch={false}
      className="group flex gap-3 overflow-hidden rounded-card border border-border-brand bg-white p-3 shadow-soft transition-shadow hover:shadow-lifted sm:flex-col sm:gap-0 sm:p-0"
    >
      <div className="relative hidden aspect-[16/9] sm:block">
        <ProductImage src={shop.coverImageUrl} alt={shop.businessName} categorySlug="vendor" className="h-full w-full" />
      </div>
      <div className="shrink-0 sm:hidden">
        <VendorLogo logoUrl={shop.logoUrl} coverImageUrl={shop.coverImageUrl} businessName={shop.businessName} size={56} className="text-lg" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:p-3.5">
        <div className="hidden sm:-mt-7 sm:flex sm:items-end sm:gap-2">
          <VendorLogo logoUrl={shop.logoUrl} coverImageUrl={shop.coverImageUrl} businessName={shop.businessName} size={40} />
        </div>
        <h3 className="truncate font-heading text-base font-bold text-brand-dark group-hover:text-brand-primary">{shop.businessName}</h3>
        {shop.shopType && <p className="text-xs text-gray-500">{SHOP_TYPE_LABELS[shop.shopType]}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          {etaLabel && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {etaLabel}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bike className="h-3.5 w-3.5" aria-hidden />
            {feeLabel(eta, hasFreeDelivery)}
          </span>
        </div>
        {shop.offers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {shop.offers.map((o) => (
              <OfferBadge key={`${o.kind}-${o.label}`} offer={o} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
