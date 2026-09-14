import type { OrderStatus, BusinessType } from "@/generated/prisma/client";

/** Ordinary vendor orders skip "Ready for pickup" entirely — restaurant orders require it. */
export const VENDOR_ORDER_FLOW: OrderStatus[] = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PREPARING",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
];

export const RESTAURANT_ORDER_FLOW: OrderStatus[] = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED", "FAILED_DELIVERY", "RETURNED", "REFUNDED"];

export function getOrderFlow(businessType: BusinessType): OrderStatus[] {
  return businessType === "RESTAURANT" ? RESTAURANT_ORDER_FLOW : VENDOR_ORDER_FLOW;
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Who is expected to trigger the transition INTO this status. */
export const TRANSITION_ACTOR: Record<OrderStatus, "VENDOR" | "RIDER" | "ADMIN"> = {
  ORDER_PLACED: "ADMIN",
  CONFIRMED: "VENDOR",
  PREPARING: "VENDOR",
  READY_FOR_PICKUP: "VENDOR",
  RIDER_ASSIGNED: "RIDER",
  PICKED_UP: "RIDER",
  ON_THE_WAY: "RIDER",
  DELIVERED: "RIDER",
  CANCELLED: "VENDOR",
  FAILED_DELIVERY: "RIDER",
  RETURNED: "ADMIN",
  REFUNDED: "ADMIN",
};

/**
 * Server-side gate for every status change. Forward-only along the
 * business-type-specific flow, plus a small set of exception paths
 * (cancel, failed delivery, return, refund). Never allows skipping a step
 * or moving a completed order backwards.
 */
export function canTransition(current: OrderStatus, next: OrderStatus, businessType: BusinessType): boolean {
  if (current === next) return false;

  // These exception paths are the only transitions allowed out of a
  // terminal status (e.g. DELIVERED -> REFUNDED) — checked before the
  // terminal guard below so they aren't blocked by it.
  if (next === "CANCELLED") {
    // Can only cancel before the rider has physically picked up the order.
    return current === "ORDER_PLACED" || current === "CONFIRMED" || current === "PREPARING" || current === "READY_FOR_PICKUP";
  }
  if (next === "FAILED_DELIVERY") {
    return current === "RIDER_ASSIGNED" || current === "PICKED_UP" || current === "ON_THE_WAY";
  }
  if (next === "RETURNED") {
    return current === "FAILED_DELIVERY" || current === "DELIVERED";
  }
  if (next === "REFUNDED") {
    return current === "DELIVERED" || current === "CANCELLED" || current === "FAILED_DELIVERY" || current === "RETURNED";
  }

  if (isTerminal(current)) return false;

  const flow = getOrderFlow(businessType);
  const curIdx = flow.indexOf(current);
  const nextIdx = flow.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return false;
  return nextIdx === curIdx + 1;
}

const ALL_STATUSES: OrderStatus[] = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
  "RETURNED",
  "REFUNDED",
];

/** Every status this actor could legally move `current` to next, for rendering action buttons. */
export function getAvailableNextStatuses(current: OrderStatus, businessType: BusinessType, actor: "VENDOR" | "RIDER" | "ADMIN"): OrderStatus[] {
  return ALL_STATUSES.filter((next) => TRANSITION_ACTOR[next] === actor && canTransition(current, next, businessType));
}

export function statusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    ORDER_PLACED: "Order placed",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY_FOR_PICKUP: "Ready for pickup",
    RIDER_ASSIGNED: "Rider assigned",
    PICKED_UP: "Picked up",
    ON_THE_WAY: "On the way",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    FAILED_DELIVERY: "Failed delivery",
    RETURNED: "Returned",
    REFUNDED: "Refunded",
  };
  return labels[status];
}
