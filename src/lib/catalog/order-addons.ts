export type OrderItemAddOn = { name: string; priceDelta: number };

/** OrderItem/CartItem.selectedAddOns is stored as loose Json — this is the one place that trusts its shape. */
export function parseSelectedAddOns(json: unknown): OrderItemAddOn[] {
  if (!Array.isArray(json)) return [];
  return json as OrderItemAddOn[];
}
