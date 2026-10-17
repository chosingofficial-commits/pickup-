import "server-only";
import { db } from "@/lib/db";
import { getDaysAgoDhakaMidnight, getDhakaDateKey } from "@/lib/date/period";

export async function getAdminOverviewStats() {
  const [
    totalSalesAgg,
    totalOrders,
    totalCustomers,
    activeVendors,
    pendingApplications,
    totalRiders,
    commissionAgg,
    pendingRefundsAgg,
    pendingPayoutsAgg,
    owedToRidersAgg,
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
    // Includes APPROVED, not just REQUESTED — approved-but-not-yet-PROCESSED
    // refunds are still money that hasn't moved yet, same rule the Finance
    // page's getFinanceRefundsSummary already uses.
    db.refund.aggregate({ where: { status: { in: ["REQUESTED", "APPROVED"] } }, _sum: { amount: true }, _count: { _all: true } }),
    db.vendorPayout.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
    // Riders with a negative balance (Pick Up owes them) — same figure as
    // getRiderPaymentSummary's weOweRidersPoisha, kept here too so the main
    // dashboard card doesn't need the whole money-overview query.
    db.riderProfile.aggregate({ where: { balancePoisha: { lt: 0 } }, _sum: { balancePoisha: true } }),
  ]);

  return {
    totalSales: Number(totalSalesAgg._sum.total ?? 0),
    totalOrders,
    totalCustomers,
    activeVendors,
    pendingApplications,
    totalRiders,
    commissionRevenue: Number(commissionAgg._sum.commissionAmount ?? 0),
    pendingRefunds: pendingRefundsAgg._count._all,
    pendingRefundsAmount: Number(pendingRefundsAgg._sum.amount ?? 0),
    pendingPayouts: pendingPayoutsAgg._count._all,
    pendingPayoutsAmount: Number(pendingPayoutsAgg._sum.amount ?? 0),
    owedToRidersAmount: Math.abs(owedToRidersAgg._sum.balancePoisha ?? 0) / 100,
  };
}

/** For the admin order-detail "Assign/change rider" picker — approved riders only. */
export async function getApprovedRiders() {
  return db.riderProfile.findMany({
    where: { isApproved: true },
    include: { user: { select: { name: true, phone: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getRecentAuditLogs(limit = 15) {
  return db.auditLog.findMany({
    include: { actorUser: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Asia/Dhaka has no DST, so each successive calendar day is exactly 24h later in UTC terms. */
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDailySalesSeries(days = 14) {
  const since = getDaysAgoDhakaMidnight(days);

  const orders = await db.order.findMany({
    where: { status: "DELIVERED", updatedAt: { gte: since } },
    select: { total: true, updatedAt: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    byDay.set(getDhakaDateKey(new Date(since.getTime() + i * DAY_MS)), 0);
  }
  for (const order of orders) {
    const key = getDhakaDateKey(order.updatedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(order.total));
  }

  return Array.from(byDay.entries()).map(([date, total]) => ({ date, total }));
}
