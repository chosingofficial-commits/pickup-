import "server-only";
import { db } from "@/lib/db";
import { getPeriodStart } from "@/lib/date/period";
import { bdDateStringToUtcStart, bdDateStringToUtcEnd } from "@/lib/date/bd-time";
import { getVendorPayoutBalance } from "@/lib/vendor/payout-balance";
import type { Prisma, PayoutStatus, OrderStatus } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

/** Every status that isn't DELIVERED and isn't one of the excluded ones below — still "in progress," not yet earning anything. */
const IN_PROGRESS_STATUSES: OrderStatus[] = ["ORDER_PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"];
/** Never going to earn anything — same "cancelled" grouping finance.ts uses (RETURNED treated like a cancellation, not a genuine REFUNDED money-movement event). */
const EXCLUDED_STATUSES: OrderStatus[] = ["CANCELLED", "FAILED_DELIVERY", "RETURNED", "REFUNDED"];

// =============================================================================
// 1) Summary cards
// =============================================================================

export type PayoutsSummary = {
  pendingCount: number;
  pendingTk: number;
  approvedCount: number;
  approvedTk: number;
  paidThisMonthTk: number;
  rejectedThisMonthCount: number;
};

export async function getPayoutsSummary(): Promise<PayoutsSummary> {
  const monthStart = getPeriodStart("month")!;
  const [pendingAgg, approvedAgg, paidAgg, rejectedCount] = await Promise.all([
    db.vendorPayout.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
    db.vendorPayout.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true }, _count: { _all: true } }),
    db.vendorPayout.aggregate({ where: { status: "PAID", processedAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.vendorPayout.count({ where: { status: "REJECTED", processedAt: { gte: monthStart } } }),
  ]);

  return {
    pendingCount: pendingAgg._count._all,
    pendingTk: Number(pendingAgg._sum.amount ?? 0),
    approvedCount: approvedAgg._count._all,
    approvedTk: Number(approvedAgg._sum.amount ?? 0),
    paidThisMonthTk: Number(paidAgg._sum.amount ?? 0),
    rejectedThisMonthCount: rejectedCount,
  };
}

// =============================================================================
// Eligibility — the one shared calculation the list, the detail page, and
// the server-side re-check inside transitionPayoutStatus all agree with.
// =============================================================================

export type PayoutEligibility = {
  earnings: number;
  paid: number;
  reservedByOthers: number;
  availableForThisRequest: number;
  requestedAmount: number;
  canBePaid: boolean;
  shortByTk: number;
};

/**
 * `balance` is the vendor's current getVendorPayoutBalance() result —
 * passed in rather than fetched here so a page listing many payouts for
 * the same vendor (or the same vendor's own balance already fetched for
 * other reasons) only computes it once per vendor, not once per row.
 */
export function computeEligibility(requestedAmount: number, balance: { earnings: number; paid: number; reserved: number }): PayoutEligibility {
  const reservedByOthers = balance.reserved - requestedAmount;
  const availableForThisRequest = balance.earnings - balance.paid - reservedByOthers;
  const canBePaid = availableForThisRequest >= requestedAmount;
  return {
    earnings: balance.earnings,
    paid: balance.paid,
    reservedByOthers,
    availableForThisRequest,
    requestedAmount,
    canBePaid,
    shortByTk: canBePaid ? 0 : Math.round((requestedAmount - availableForThisRequest) * 100) / 100,
  };
}

export async function getPayoutEligibility(payoutId: string): Promise<PayoutEligibility | null> {
  const payout = await db.vendorPayout.findUnique({ where: { id: payoutId }, select: { vendorId: true, amount: true } });
  if (!payout) return null;
  const balance = await getVendorPayoutBalance(payout.vendorId);
  return computeEligibility(Number(payout.amount), balance);
}

// =============================================================================
// 2) Payouts list
// =============================================================================

export type PayoutListFilters = { status?: string; vendorQuery?: string; from?: string; to?: string; page?: number };

export type PayoutListRow = {
  id: string;
  requestedAt: Date;
  vendorId: string;
  vendorName: string;
  businessType: "GROCERY_VENDOR" | "RESTAURANT";
  requestedAmountTk: number;
  vendorAvailableTk: number;
  payoutDestination: string | null;
  status: PayoutStatus;
  eligibility: PayoutEligibility | null;
};

export async function getPayoutsList(filters: PayoutListFilters): Promise<{ rows: PayoutListRow[]; totalCount: number; totalPages: number; page: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.VendorPayoutWhereInput = {};
  if (filters.status && filters.status !== "ALL") where.status = filters.status as PayoutStatus;
  if (filters.vendorQuery?.trim()) where.vendor = { businessName: { contains: filters.vendorQuery.trim(), mode: "insensitive" } };
  if (filters.from || filters.to) {
    where.requestedAt = {
      ...(filters.from ? { gte: bdDateStringToUtcStart(filters.from) } : {}),
      ...(filters.to ? { lte: bdDateStringToUtcEnd(filters.to) } : {}),
    };
  }

  const [payouts, totalCount] = await Promise.all([
    db.vendorPayout.findMany({
      where,
      include: { vendor: { select: { id: true, businessName: true, businessType: true, application: { select: { bankOrMfsAccount: true } } } } },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.vendorPayout.count({ where }),
  ]);

  // One balance lookup per distinct vendor on this page, not one per row.
  const distinctVendorIds = Array.from(new Set(payouts.map((p) => p.vendorId)));
  const balances = new Map(await Promise.all(distinctVendorIds.map(async (id) => [id, await getVendorPayoutBalance(id)] as const)));

  const rows: PayoutListRow[] = payouts.map((p) => {
    const balance = balances.get(p.vendorId)!;
    const amount = Number(p.amount);
    const needsEligibility = p.status === "PENDING" || p.status === "APPROVED";
    return {
      id: p.id,
      requestedAt: p.requestedAt,
      vendorId: p.vendorId,
      vendorName: p.vendor.businessName,
      businessType: p.vendor.businessType,
      requestedAmountTk: amount,
      vendorAvailableTk: balance.available,
      payoutDestination: p.vendor.application?.bankOrMfsAccount ?? null,
      status: p.status,
      eligibility: needsEligibility ? computeEligibility(amount, balance) : null,
    };
  });

  return { rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), page };
}

// =============================================================================
// 3) Vendor money breakdown — shared by the payout detail page (section B+C)
//    and the admin vendor detail page's "Payouts & balance" section.
// =============================================================================

export type VendorMoneyBreakdown = {
  itemSalesTk: number;
  commissionTk: number;
  earningsTk: number;
  paidTk: number;
  reservedTk: number;
  availableTk: number;
  inProgress: { count: number; itemSalesTk: number };
  excluded: { count: number; amountTk: number };
};

export async function getVendorMoneyBreakdown(vendorId: string): Promise<VendorMoneyBreakdown> {
  const [deliveredAgg, balance, inProgressAgg, excludedAgg] = await Promise.all([
    db.order.aggregate({ where: { vendorId, status: "DELIVERED" }, _sum: { subtotal: true, commissionAmount: true } }),
    getVendorPayoutBalance(vendorId),
    db.order.aggregate({ where: { vendorId, status: { in: IN_PROGRESS_STATUSES } }, _sum: { subtotal: true }, _count: { _all: true } }),
    db.order.aggregate({ where: { vendorId, status: { in: EXCLUDED_STATUSES } }, _sum: { total: true }, _count: { _all: true } }),
  ]);

  return {
    itemSalesTk: Number(deliveredAgg._sum.subtotal ?? 0),
    commissionTk: Number(deliveredAgg._sum.commissionAmount ?? 0),
    earningsTk: balance.earnings,
    paidTk: balance.paid,
    reservedTk: balance.reserved,
    availableTk: balance.available,
    inProgress: { count: inProgressAgg._count._all, itemSalesTk: Number(inProgressAgg._sum.subtotal ?? 0) },
    excluded: { count: excludedAgg._count._all, amountTk: Number(excludedAgg._sum.total ?? 0) },
  };
}

// =============================================================================
// 4) Vendor info (section A)
// =============================================================================

export async function getVendorInfoForPayout(vendorId: string) {
  return db.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      businessName: true,
      businessType: true,
      commissionRatePct: true,
      isApproved: true,
      isSuspended: true,
      createdAt: true,
      user: { select: { name: true, phone: true, email: true } },
      application: { select: { bankOrMfsAccount: true } },
    },
  });
}

// =============================================================================
// 5) Delivered orders behind the earnings (section D)
// =============================================================================

export type VendorDeliveredOrderRow = {
  id: string;
  orderNumber: string;
  deliveredAt: Date;
  itemSalesTk: number;
  ratePct: number;
  commissionTk: number;
  vendorEarningsTk: number;
  paymentMethod: "COD" | "Online";
};

export async function getVendorDeliveredOrders(vendorId: string, page: number): Promise<{ rows: VendorDeliveredOrderRow[]; totalCount: number; totalPages: number }> {
  const where: Prisma.OrderWhereInput = { vendorId, status: "DELIVERED" };
  const [orders, totalCount] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        updatedAt: true,
        subtotal: true,
        commissionRatePct: true,
        commissionAmount: true,
        vendorEarnings: true,
        orderGroup: { select: { payment: { select: { provider: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
  ]);

  const rows: VendorDeliveredOrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    deliveredAt: o.updatedAt,
    itemSalesTk: Number(o.subtotal),
    ratePct: Number(o.commissionRatePct),
    commissionTk: Number(o.commissionAmount),
    vendorEarningsTk: Number(o.vendorEarnings),
    paymentMethod: o.orderGroup.payment?.provider === "COD" || !o.orderGroup.payment ? "COD" : "Online",
  }));

  return { rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) };
}

// =============================================================================
// 6) Payout history for this vendor, with who approved/paid/rejected
//    (section F)
// =============================================================================

export type PayoutHistoryRow = {
  id: string;
  requestedAt: Date;
  processedAt: Date | null;
  amountTk: number;
  status: PayoutStatus;
  referenceNo: string | null;
  adminNote: string | null;
  events: { actorName: string; actorRole: string; fromStatus: string; toStatus: string; at: Date }[];
};

export async function getVendorPayoutHistory(vendorId: string): Promise<PayoutHistoryRow[]> {
  const payouts = await db.vendorPayout.findMany({ where: { vendorId }, orderBy: { requestedAt: "desc" } });
  if (payouts.length === 0) return [];

  const logs = await db.auditLog.findMany({
    where: { entityType: "VendorPayout", entityId: { in: payouts.map((p) => p.id) } },
    include: { actorUser: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  const logsByPayoutId = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!log.entityId) continue;
    const list = logsByPayoutId.get(log.entityId) ?? [];
    list.push(log);
    logsByPayoutId.set(log.entityId, list);
  }

  return payouts.map((p) => ({
    id: p.id,
    requestedAt: p.requestedAt,
    processedAt: p.processedAt,
    amountTk: Number(p.amount),
    status: p.status,
    referenceNo: p.referenceNo,
    adminNote: p.adminNote,
    events: (logsByPayoutId.get(p.id) ?? []).map((log) => {
      const metadata = (log.metadata as Record<string, unknown> | null) ?? {};
      return {
        actorName: log.actorUser?.name ?? "—",
        actorRole: typeof metadata.actorRole === "string" ? metadata.actorRole : (log.actorUser?.role ?? "—"),
        fromStatus: typeof metadata.fromStatus === "string" ? metadata.fromStatus : "—",
        toStatus: typeof metadata.toStatus === "string" ? metadata.toStatus : "—",
        at: log.createdAt,
      };
    }),
  }));
}
