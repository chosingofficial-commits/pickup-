import "server-only";
import { db } from "@/lib/db";

export async function getAvailableAssignments() {
  return db.order.findMany({
    where: {
      delivery: { riderId: null },
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

export async function getRiderHistory(riderId: string) {
  return db.order.findMany({
    where: { delivery: { riderId }, status: { in: ["DELIVERED", "FAILED_DELIVERY"] } },
    include: { vendor: true, customer: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getRiderDeliveryStats(riderId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [deliveredToday, deliveredTotal] = await Promise.all([
    db.order.count({ where: { delivery: { riderId }, status: "DELIVERED", updatedAt: { gte: startOfToday } } }),
    db.order.count({ where: { delivery: { riderId }, status: "DELIVERED" } }),
  ]);

  return { deliveredToday, deliveredTotal };
}
