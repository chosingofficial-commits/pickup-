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

export type FreeDeliveryOffer = { enabled: boolean; minOrderAmount: number };
export type FreeDeliveryOffers = {
  /** Sitewide, only for a customer's very first order (no prior OrderGroup). */
  firstOrder: FreeDeliveryOffer;
  /** Sitewide, every order — replaces the old per-zone DeliveryZone.freeDeliveryThreshold rule. */
  allOrders: FreeDeliveryOffer;
};

/**
 * Which active free-delivery offer (if any) waives delivery for this order —
 * null when none applies. The single source of truth used by the homepage
 * banner (so it never advertises something checkout won't honor), by
 * cart/checkout/place-order (so the number a customer sees never drifts from
 * what they're charged), and by place-order's Order.freeDeliveryReason
 * snapshot (so admin/order-detail can label a Tk 0 fee honestly later,
 * without re-guessing from settings that may have since changed).
 */
export function getFreeDeliveryReason(orderSubtotal: number, isFirstOrder: boolean, offers: FreeDeliveryOffers): string | null {
  if (offers.firstOrder.enabled && isFirstOrder && orderSubtotal >= offers.firstOrder.minOrderAmount) return "First order free delivery offer";
  if (offers.allOrders.enabled && orderSubtotal >= offers.allOrders.minOrderAmount) return "Free delivery on all orders";
  return null;
}

/** True when ANY active free-delivery offer waives delivery for this order. */
export function freeDeliveryApplies(orderSubtotal: number, isFirstOrder: boolean, offers: FreeDeliveryOffers): boolean {
  return getFreeDeliveryReason(orderSubtotal, isFirstOrder, offers) !== null;
}

export function computeVatAmount(subtotal: number, vatRatePct: number): number {
  return round2(subtotal * (vatRatePct / 100));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
