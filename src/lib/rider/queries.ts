import "server-only";
import type { OrderStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getPeriodStart } from "@/lib/rider/balance";

/**
 * A rider sees an order here ONLY once the vendor has clicked "Find rider"
 * (riderSearchStartedAt set) — being PREPARING/READY_FOR_PICKUP alone is no
 * longer enough. See findRiderAction, which sets it and notifies every
 * eligible rider at once; whichever rider accepts first wins the race in
 * advanceOrderStatusAction's guarded update.
 */
export async function getAvailableAssignments() {
  return db.order.findMany({
    where: {
      delivery: { riderId: null, riderSearchStartedAt: { not: null } },
      OR: [
        { vendor: { businessType: "GROCERY_VENDOR" }, status: "PREPARING" },
        { vendor: { businessType: "RESTAURANT" }, status: "READY_FOR_PICKUP" },
      ],
    },
    include: { vendor: true, address: { include: { neighbourhood: true } }, items: true },
    orderBy: { createdAt: "asc" },
  });
}

/** True while this rider already has a delivery in progress — they shouldn't be offered (or rung for) another one until it's done. */
export async function isRiderCurrentlyBusy(riderId: string): Promise<boolean> {
  const active = await db.order.findFirst({
    where: { delivery: { riderId }, status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } },
    select: { id: true },
  });
  return active != null;
}

export async function getRiderActiveDeliveries(riderId: string) {
  return db.order.findMany({
    where: {
      delivery: { riderId },
      status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"] },
    },
    include: { vendor: true, address: { include: { neighbourhood: true } }, items: true, customer: { select: { name: true, phone: true } }, delivery: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRiderHistory(riderId: string, options?: { since?: Date; statusIn?: OrderStatus[] }) {
  return db.order.findMany({
    where: {
      delivery: { riderId },
      status: { in: options?.statusIn ?? ["DELIVERED", "FAILED_DELIVERY"] },
      ...(options?.since ? { updatedAt: { gte: options.since } } : {}),
    },
    include: { vendor: true, customer: { select: { name: true } }, delivery: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

/** National ID numbers that appear on more than one RiderProfile — surfaced as an admin warning badge. Registration itself never blocks on this. */
export async function getDuplicateNationalIdNumbers(): Promise<Set<string>> {
  const groups = await db.riderProfile.groupBy({
    by: ["nationalIdNo"],
    where: { nationalIdNo: { not: null } },
    _count: { nationalIdNo: true },
    having: { nationalIdNo: { _count: { gt: 1 } } },
  });
  return new Set(groups.map((g) => g.nationalIdNo!));
}

export async function getRiderDeliveryStats(riderId: string) {
  const startOfToday = getPeriodStart("today")!;

  const [deliveredToday, deliveredTotal] = await Promise.all([
    db.order.count({ where: { delivery: { riderId }, status: "DELIVERED", updatedAt: { gte: startOfToday } } }),
    db.order.count({ where: { delivery: { riderId }, status: "DELIVERED" } }),
  ]);

  return { deliveredToday, deliveredTotal };
}
