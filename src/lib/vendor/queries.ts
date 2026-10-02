import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isTobaccoModuleEnabled } from "@/lib/tobacco/queries";

/** Mirrors the vendor-facing "Pending orders" definition — anything still waiting on the vendor before a rider takes over. */
export const PENDING_ORDER_STATUSES: OrderStatus[] = ["ORDER_PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"];
/** Orders excluded from "Total orders" — cancelled/failed ones were never fulfilled. */
const EXCLUDED_FROM_TOTAL_STATUSES: OrderStatus[] = ["CANCELLED", "FAILED_DELIVERY"];

export async function getVendorForUser(userId: string) {
  return db.vendor.findUnique({ where: { userId }, include: { restaurant: { include: { weeklyHours: true } } } });
}

/**
 * Categories a vendor can assign a product to. Unlike the customer-facing
 * catalog queries, this deliberately includes age-restricted categories —
 * a vendor has to be able to pick "Cigarettes & Smoking Accessories" to
 * list one — but only once the tobacco module is actually enabled, since
 * assigning into it while disabled would just be rejected on submit.
 */
export async function getCategoriesForProductForm() {
  const tobaccoEnabled = await isTobaccoModuleEnabled();
  return db.category.findMany({
    where: { isActive: true, ...(tobaccoEnabled ? {} : { isAgeRestricted: false }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getVendorDashboardStats(vendorId: string) {
  const [orderCount, revenueAgg, commissionAgg, payoutAgg, pendingOrders] = await Promise.all([
    db.order.count({ where: { vendorId, status: { notIn: EXCLUDED_FROM_TOTAL_STATUSES } } }),
    db.order.aggregate({ where: { vendorId, status: "DELIVERED" }, _sum: { total: true } }),
    // Only orders that actually reached DELIVERED count toward earnings —
    // CommissionEntry rows are written at order-placement time, well before
    // delivery, so an unfiltered sum here would count in-progress, cancelled,
    // failed, returned, and refunded orders as available-for-payout money the
    // platform hasn't (and may never) collect.
    db.commissionEntry.aggregate({ where: { vendorId, order: { status: "DELIVERED" } }, _sum: { commissionAmount: true, vendorEarnings: true } }),
    db.vendorPayout.aggregate({ where: { vendorId, status: "PENDING" }, _sum: { amount: true } }),
    db.order.count({ where: { vendorId, status: { in: PENDING_ORDER_STATUSES } } }),
  ]);

  return {
    totalOrders: orderCount,
    revenue: Number(revenueAgg._sum.total ?? 0),
    commissionPaid: Number(commissionAgg._sum.commissionAmount ?? 0),
    earnings: Number(commissionAgg._sum.vendorEarnings ?? 0),
    pendingPayout: Number(payoutAgg._sum.amount ?? 0),
    pendingOrders,
  };
}

export async function getVendorProducts(vendorId: string) {
  return db.product.findMany({
    where: { vendorId, deletedAt: null },
    include: { images: { take: 1 }, category: true, inventory: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVendorOrders(vendorId: string, statusFilter?: string) {
  const where: Prisma.OrderWhereInput = { vendorId };
  // "PENDING"/"ACTIVE" are synthetic multi-status groupings matching the
  // dashboard's "Pending orders"/"Total orders" cards exactly, so clicking
  // through always shows a list whose length equals the card's number.
  if (statusFilter === "PENDING") where.status = { in: PENDING_ORDER_STATUSES };
  else if (statusFilter === "ACTIVE") where.status = { notIn: EXCLUDED_FROM_TOTAL_STATUSES };
  else if (statusFilter && statusFilter !== "ALL") where.status = statusFilter as OrderStatus;

  return db.order.findMany({
    where,
    include: {
      items: true,
      customer: { select: { name: true, phone: true } },
      address: { include: { neighbourhood: true } },
      delivery: { select: { riderId: true, riderSearchStartedAt: true, rider: { select: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getVendorOrderDetail(vendorId: string, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: { select: { name: true, phone: true } },
      address: { include: { neighbourhood: { include: { town: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      delivery: { include: { rider: { include: { user: { select: { name: true, phone: true } } } } } },
      vendor: { select: { businessName: true } },
    },
  });
  if (!order || order.vendorId !== vendorId) return null;
  return order;
}
