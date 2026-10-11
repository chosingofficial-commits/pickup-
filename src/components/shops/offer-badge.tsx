import { Badge } from "@/components/ui/badge";
import type { ShopOffer } from "@/lib/shops/queries";

const VARIANT_BY_KIND: Record<ShopOffer["kind"], "brand" | "accent" | "success"> = {
  discount: "brand",
  coupon: "accent",
  freeDelivery: "success",
};

export function OfferBadge({ offer }: { offer: ShopOffer }) {
  return <Badge variant={VARIANT_BY_KIND[offer.kind]}>{offer.label}</Badge>;
}
