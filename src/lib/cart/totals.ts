/**
 * Pure cart/checkout math shared by the cart page and checkout so the
 * number the customer sees never drifts from the number they're charged.
 */

export type PricedLine = {
  unitPrice: number;
  quantity: number;
  addOnsTotal: number;
};

export function lineTotal(line: PricedLine): number {
  return (line.unitPrice + line.addOnsTotal) * line.quantity;
}

export function groupSubtotal(lines: PricedLine[]): number {
  return round2(lines.reduce((sum, l) => sum + lineTotal(l), 0));
}

export type Coupon = {
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
};

/** Coupon discount is applied against the whole cart's subtotal, not per vendor. */
export function computeCouponDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (subtotal < coupon.minOrderAmount) return 0;
  const raw = coupon.type === "PERCENTAGE" ? subtotal * (coupon.value / 100) : coupon.value;
  const capped = coupon.maxDiscountAmount != null ? Math.min(raw, coupon.maxDiscountAmount) : raw;
  return round2(Math.min(capped, subtotal));
}

/** Delivery fee for one vendor's order in a given zone (waived past the zone's free threshold). */
export function computeVendorDeliveryFee(vendorSubtotal: number, zone: { deliveryFee: number; freeDeliveryThreshold?: number | null }): number {
  if (zone.freeDeliveryThreshold != null && vendorSubtotal >= zone.freeDeliveryThreshold) return 0;
  return round2(zone.deliveryFee);
}

export type FreeDeliveryPromo = { enabled: boolean; minOrderAmount: number };

/**
 * True when the sitewide first-order free-delivery promo waives delivery for
 * this order — the single source of truth used by the homepage banner
 * (whether the amount it advertises is real) and by cart/checkout/place-order
 * (whether to actually waive the fee), so they can never disagree.
 */
export function freeDeliveryPromoApplies(orderSubtotal: number, isFirstOrder: boolean, promo: FreeDeliveryPromo): boolean {
  return promo.enabled && isFirstOrder && orderSubtotal >= promo.minOrderAmount;
}

export function computeVatAmount(subtotal: number, vatRatePct: number): number {
  return round2(subtotal * (vatRatePct / 100));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
