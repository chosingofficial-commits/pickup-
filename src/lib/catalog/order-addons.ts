export type OrderItemAddOn = { name: string; priceDelta: number };

/** OrderItem/CartItem.selectedAddOns is stored as loose Json — this is the one place that trusts its shape. */
export function parseSelectedAddOns(json: unknown): OrderItemAddOn[] {
  if (!Array.isArray(json)) return [];
  return json as OrderItemAddOn[];
}

/** "REMOVE" | "CALL" -> the customer-facing phrase shown in cart/checkout/order views. */
export function formatUnavailableAction(action: string | null): string | null {
  if (action === "REMOVE") return "If unavailable: remove it from my order";
  if (action === "CALL") return "If unavailable: call me";
  return null;
}
