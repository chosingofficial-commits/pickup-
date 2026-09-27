import "server-only";
import { db } from "@/lib/db";

export async function getAdminOverviewStats() {
  const [
    totalSalesAgg,
    totalOrders,
    totalCustomers,
    activeVendors,
    pendingApplications,
    totalRiders,
    commissionAgg,
    pendingRefunds,
    pendingPayouts,
  ] = await Promise.all([
    db.order.aggregate({ where: { status: "DELIVERED" }, _sum: { total: true } }),
    db.order.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.vendor.count({ where: { isApproved: true, isSuspended: false } }),
    db.vendorApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.riderProfile.count(),
    // Same DELIVERED-only rule as totalSalesAgg/getDailySalesSeries above —
    // commission on an order that hasn't been delivered isn't realized revenue.
    db.commissionEntry.aggregate({ where: { order: { status: "DELIVERED" } }, _sum: { commissionAmount: true } }),
    db.refund.count({ where: { status: "REQUESTED" } }),
    db.vendorPayout.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalSales: Number(totalSalesAgg._sum.total ?? 0),
    totalOrders,
    totalCustomers,
    activeVendors,
    pendingApplications,
    totalRiders,
    commissionRevenue: Number(commissionAgg._sum.commissionAmount ?? 0),
    pendingRefunds,
    pendingPayouts,
  };
}

export async function getRecentAuditLogs(limit = 15) {
  return db.auditLog.findMany({
    include: { actorUser: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getDailySalesSeries(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: { status: "DELIVERED", updatedAt: { gte: since } },
    select: { total: true, updatedAt: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of orders) {
    const key = order.updatedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(order.total));
  }

  return Array.from(byDay.entries()).map(([date, total]) => ({ date, total }));
}
