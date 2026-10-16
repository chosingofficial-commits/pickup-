import "server-only";
import { db } from "@/lib/db";
import { fromPoisha } from "@/lib/rider/ledger";
import { getPeriodStart, type PeriodKey } from "@/lib/date/period";
import { getAdminMoneyOverview } from "@/lib/admin/money";
import type { FinanceRange } from "@/lib/admin/finance-period";
import type { BusinessType, OrderStatus, Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 25;

/**
 * Every order status bucketed into the 4 groups the Finance page reports by
 * — the single place this grouping is defined, so every section (order
 * counts, any future status-based query) agrees on it. RETURNED is grouped
 * with "cancelled" (no money changes hands differently than a cancellation
 * from this page's point of view — a genuine refund of money is tracked
 * separately, under REFUNDED).
 */
const STATUS_BUCKETS = {
  delivered: ["DELIVERED"] as OrderStatus[],
  inProgress: ["ORDER_PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"] as OrderStatus[],
  cancelled: ["CANCELLED", "FAILED_DELIVERY", "RETURNED"] as OrderStatus[],
  refunded: ["REFUNDED"] as OrderStatus[],
};
const STATUS_TO_BUCKET: Record<OrderStatus, keyof typeof STATUS_BUCKETS> = Object.fromEntries(
  Object.entries(STATUS_BUCKETS).flatMap(([bucket, statuses]) => statuses.map((s) => [s, bucket])),
) as Record<OrderStatus, keyof typeof STATUS_BUCKETS>;

function createdAtFilter(range: FinanceRange): Prisma.OrderWhereInput["createdAt"] {
  if (!range.start && !range.end) return undefined;
  return { ...(range.start ? { gte: range.start } : {}), ...(range.end ? { lt: range.end } : {}) };
}

function genericDateFilter(range: FinanceRange): { gte?: Date; lt?: Date } | undefined {
  if (!range.start && !range.end) return undefined;
  return { ...(range.start ? { gte: range.start } : {}), ...(range.end ? { lt: range.end } : {}) };
}

// =============================================================================
// 2) ORDERS — split by type and status
// =============================================================================

export type StatusBucketStats = { count: number; amountTk: number };
export type OrderTypeBreakdown = {
  count: number;
  amountTk: number;
  byStatus: Record<keyof typeof STATUS_BUCKETS, StatusBucketStats>;
};
export type OrdersBreakdown = {
  total: OrderTypeBreakdown;
  restaurant: OrderTypeBreakdown;
  shop: OrderTypeBreakdown;
};

function emptyTypeBreakdown(): OrderTypeBreakdown {
  return {
    count: 0,
    amountTk: 0,
    byStatus: {
      delivered: { count: 0, amountTk: 0 },
      inProgress: { count: 0, amountTk: 0 },
      cancelled: { count: 0, amountTk: 0 },
      refunded: { count: 0, amountTk: 0 },
    },
  };
}

/**
 * Orders placed in the selected range (Order.createdAt — "placed", not
 * "delivered"; see the rules box this feeds), split by vendor business type
 * and by status bucket. Two groupBy calls (one per business type) rather
 * than one query per status — Prisma can't group by a joined relation
 * field (Vendor.businessType) directly.
 */
export async function getFinanceOrdersBreakdown(range: FinanceRange): Promise<OrdersBreakdown> {
  const createdAt = createdAtFilter(range);

  async function forType(businessType: BusinessType): Promise<OrderTypeBreakdown> {
    const rows = await db.order.groupBy({
      by: ["status"],
      where: { vendor: { businessType }, createdAt },
      _count: { _all: true },
      _sum: { total: true },
    });
    const result = emptyTypeBreakdown();
    for (const row of rows) {
      const bucket = STATUS_TO_BUCKET[row.status];
      result.count += row._count._all;
      result.amountTk += Number(row._sum.total ?? 0);
      result.byStatus[bucket].count += row._count._all;
      result.byStatus[bucket].amountTk += Number(row._sum.total ?? 0);
    }
    return result;
  }

  const [restaurant, shop] = await Promise.all([forType("RESTAURANT"), forType("GROCERY_VENDOR")]);

  const total = emptyTypeBreakdown();
  for (const t of [restaurant, shop] as const) {
    total.count += t.count;
    total.amountTk += t.amountTk;
    for (const key of Object.keys(STATUS_BUCKETS) as (keyof typeof STATUS_BUCKETS)[]) {
      total.byStatus[key].count += t.byStatus[key].count;
      total.byStatus[key].amountTk += t.byStatus[key].amountTk;
    }
  }

  return { total, restaurant, shop };
}

// =============================================================================
// 3) REFUNDS
// =============================================================================

export type RefundsSummary = {
  ordersCount: number;
  itemsCount: number;
  totalTk: number;
  restaurant: { ordersCount: number; totalTk: number };
  shop: { ordersCount: number; totalTk: number };
};

const PROCESSED_REFUND_WHERE = (range: FinanceRange) => ({ status: "PROCESSED" as const, processedAt: genericDateFilter(range) });

/**
 * Only PROCESSED refunds count as "actually refunded" (REQUESTED/APPROVED
 * haven't moved any money yet; REJECTED never will) — see the "How we
 * count" box and the check table for how this differs from the existing
 * Money overview's refund figure, which doesn't filter by status at all.
 */
export async function getFinanceRefundsSummary(range: FinanceRange): Promise<RefundsSummary> {
  const where = PROCESSED_REFUND_WHERE(range);

  const [overall, restaurantAgg, shopAgg, items] = await Promise.all([
    db.refund.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    db.refund.aggregate({ where: { ...where, order: { vendor: { businessType: "RESTAURANT" } } }, _sum: { amount: true }, _count: { _all: true } }),
    db.refund.aggregate({ where: { ...where, order: { vendor: { businessType: "GROCERY_VENDOR" } } }, _sum: { amount: true }, _count: { _all: true } }),
    // Every refund today is a full refund of the whole order (see the rules
    // box), so "items refunded" = every OrderItem belonging to an order that
    // has a processed refund in this range.
    db.orderItem.aggregate({ where: { order: { refunds: { some: where } } }, _sum: { quantity: true } }),
  ]);

  return {
    ordersCount: overall._count._all,
    itemsCount: items._sum.quantity ?? 0,
    totalTk: Number(overall._sum.amount ?? 0),
    restaurant: { ordersCount: restaurantAgg._count._all, totalTk: Number(restaurantAgg._sum.amount ?? 0) },
    shop: { ordersCount: shopAgg._count._all, totalTk: Number(shopAgg._sum.amount ?? 0) },
  };
}

export type RefundListRow = {
  id: string;
  processedAt: Date | null;
  orderNumber: string | null;
  customerName: string;
  vendorName: string | null;
  businessType: BusinessType | null;
  items: { name: string; quantity: number }[];
  totalQuantity: number;
  amountTk: number;
  reason: string;
  isFull: boolean;
};

export async function getFinanceRefundsList(range: FinanceRange, page: number): Promise<{ rows: RefundListRow[]; totalCount: number; totalPages: number }> {
  const where = PROCESSED_REFUND_WHERE(range);
  const [refunds, totalCount] = await Promise.all([
    db.refund.findMany({
      where,
      include: {
        payment: { include: { orderGroup: { include: { customer: { select: { name: true } } } } } },
        order: { include: { items: { select: { nameSnapshot: true, quantity: true } }, vendor: { select: { businessName: true, businessType: true } } } },
      },
      orderBy: { processedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.refund.count({ where }),
  ]);

  const rows: RefundListRow[] = refunds.map((r) => {
    const items = r.order?.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })) ?? [];
    return {
      id: r.id,
      processedAt: r.processedAt,
      orderNumber: r.order ? r.order.orderNumber ?? null : null,
      customerName: r.payment.orderGroup.customer.name,
      vendorName: r.order?.vendor.businessName ?? null,
      businessType: r.order?.vendor.businessType ?? null,
      items,
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      amountTk: Number(r.amount),
      reason: r.reason,
      isFull: r.order ? Number(r.amount) === Number(r.order.total) : true,
    };
  });

  return { rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) };
}

// =============================================================================
// 4) COMMISSION
// =============================================================================

const DELIVERED_IN_RANGE = (range: FinanceRange) => ({ status: "DELIVERED" as const, updatedAt: genericDateFilter(range) });

export type VendorCommissionTotals = { vendorCommissionTk: number; itemSalesTk: number; orderCount: number };

export async function getVendorCommissionTotals(range: FinanceRange): Promise<VendorCommissionTotals> {
  const agg = await db.order.aggregate({
    where: DELIVERED_IN_RANGE(range),
    _sum: { commissionAmount: true, subtotal: true },
    _count: { _all: true },
  });
  return { vendorCommissionTk: Number(agg._sum.commissionAmount ?? 0), itemSalesTk: Number(agg._sum.subtotal ?? 0), orderCount: agg._count._all };
}

export type VendorCommissionRow = {
  vendorId: string;
  vendorName: string;
  businessType: BusinessType;
  orderCount: number;
  itemSalesTk: number;
  commissionTk: number;
  /** The blended rate actually applied this period (commission / item sales), derived from each order's own snapshot rate — NOT the vendor's current live rate, which may have changed since. */
  effectiveRatePct: number;
};

export async function getVendorCommissionRows(range: FinanceRange, page: number): Promise<{ rows: VendorCommissionRow[]; totalCount: number; totalPages: number }> {
  const where = DELIVERED_IN_RANGE(range);
  const grouped = await db.order.groupBy({
    by: ["vendorId"],
    where,
    _sum: { commissionAmount: true, subtotal: true },
    _count: { _all: true },
    orderBy: { _sum: { commissionAmount: "desc" } },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const totalGroups = await db.order.groupBy({ by: ["vendorId"], where });
  const totalCount = totalGroups.length;

  const vendors = await db.vendor.findMany({ where: { id: { in: grouped.map((g) => g.vendorId) } }, select: { id: true, businessName: true, businessType: true } });
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  const rows: VendorCommissionRow[] = grouped.map((g) => {
    const vendor = vendorById.get(g.vendorId);
    const itemSalesTk = Number(g._sum.subtotal ?? 0);
    const commissionTk = Number(g._sum.commissionAmount ?? 0);
    return {
      vendorId: g.vendorId,
      vendorName: vendor?.businessName ?? "(deleted vendor)",
      businessType: vendor?.businessType ?? "GROCERY_VENDOR",
      orderCount: g._count._all,
      itemSalesTk,
      commissionTk,
      effectiveRatePct: itemSalesTk > 0 ? (commissionTk / itemSalesTk) * 100 : 0,
    };
  });

  return { rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) };
}

export type OrderCommissionRow = {
  orderId: string;
  orderNumber: string;
  vendorName: string;
  updatedAt: Date;
  itemSalesTk: number;
  ratePct: number;
  commissionTk: number;
};

export async function getOrderCommissionRows(range: FinanceRange, page: number): Promise<{ rows: OrderCommissionRow[]; totalCount: number; totalPages: number }> {
  const where = DELIVERED_IN_RANGE(range);
  const [orders, totalCount] = await Promise.all([
    db.order.findMany({
      where,
      select: { id: true, orderNumber: true, updatedAt: true, subtotal: true, commissionRatePct: true, commissionAmount: true, vendor: { select: { businessName: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
  ]);

  const rows: OrderCommissionRow[] = orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    vendorName: o.vendor.businessName,
    updatedAt: o.updatedAt,
    itemSalesTk: Number(o.subtotal),
    ratePct: Number(o.commissionRatePct),
    commissionTk: Number(o.commissionAmount),
  }));

  return { rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) };
}

export type RiderCommissionTotals = { riderCommissionTk: number; deliveryCount: number };

export async function getRiderCommissionTotals(range: FinanceRange): Promise<RiderCommissionTotals> {
  const agg = await db.delivery.aggregate({
    where: { deliveredAt: genericDateFilter(range), order: { status: "DELIVERED" } },
    _sum: { platformDeliverySharePoisha: true },
    _count: { _all: true },
  });
  return { riderCommissionTk: fromPoisha(agg._sum.platformDeliverySharePoisha ?? 0), deliveryCount: agg._count._all };
}

export type RiderCommissionRow = {
  riderId: string;
  riderName: string;
  deliveryCount: number;
  deliveryFeeTotalTk: number;
  riderCommissionTk: number;
  effectiveRatePct: number;
};

export async function getRiderCommissionRows(range: FinanceRange, page: number): Promise<{ rows: RiderCommissionRow[]; totalCount: number; totalPages: number }> {
  const where = { deliveredAt: genericDateFilter(range), order: { status: "DELIVERED" as const }, riderId: { not: null } };
  const grouped = await db.delivery.groupBy({
    by: ["riderId"],
    where,
    _sum: { platformDeliverySharePoisha: true, deliveryFeePoisha: true },
    _count: { _all: true },
    orderBy: { _sum: { platformDeliverySharePoisha: "desc" } },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const totalGroups = await db.delivery.groupBy({ by: ["riderId"], where });
  const totalCount = totalGroups.length;

  const riderIds = grouped.map((g) => g.riderId).filter((id): id is string => !!id);
  const riders = await db.riderProfile.findMany({ where: { id: { in: riderIds } }, select: { id: true, user: { select: { name: true } } } });
  const riderById = new Map(riders.map((r) => [r.id, r]));

  const rows: RiderCommissionRow[] = grouped
    .filter((g) => g.riderId)
    .map((g) => {
      const rider = riderById.get(g.riderId!);
      const deliveryFeeTotalPoisha = g._sum.deliveryFeePoisha ?? 0;
      const commissionPoisha = g._sum.platformDeliverySharePoisha ?? 0;
      return {
        riderId: g.riderId!,
        riderName: rider?.user.name ?? "(deleted rider)",
        deliveryCount: g._count._all,
        deliveryFeeTotalTk: fromPoisha(deliveryFeeTotalPoisha),
        riderCommissionTk: fromPoisha(commissionPoisha),
        effectiveRatePct: deliveryFeeTotalPoisha > 0 ? (commissionPoisha / deliveryFeeTotalPoisha) * 100 : 0,
      };
    });

  return { rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) };
}

// =============================================================================
// 5) MONEY SUMMARY
// =============================================================================

export type FinanceMoneySummary = {
  customersPaidTk: number;
  itemSalesTk: number;
  deliveryFeesChargedTk: number;
  freeDeliveryCostTk: number;
  discountsTk: number;
  refundsTk: number;
  vendorCommissionTk: number;
  riderCommissionTk: number;
  paidToVendorsTk: number;
  owedToVendorsAllTimeTk: number;
  paidToRidersTk: number;
  owedToRidersAllTimeTk: number;
  netEarningsTk: number;
  codStillHeldAllTimeTk: number;
};

export async function getFinanceMoneySummary(range: FinanceRange): Promise<FinanceMoneySummary> {
  const deliveredWhere = DELIVERED_IN_RANGE(range);
  const genericRange = genericDateFilter(range);

  const [deliveredAgg, freeDeliveryAgg, refundsAgg, riderCommission, vendorPayoutsAgg, vendorAllTime, vendorPayoutsAllTime, riderPayoutsAgg, riderBalancesAllTime, codHeldAllTime] =
    await Promise.all([
      db.order.aggregate({ where: deliveredWhere, _sum: { total: true, subtotal: true, deliveryFee: true, discount: true, commissionAmount: true } }),
      db.delivery.aggregate({
        where: { deliveredAt: genericRange, order: { status: "DELIVERED", freeDeliveryReason: { not: null } } },
        _sum: { riderEarningPoisha: true },
      }),
      db.refund.aggregate({ where: PROCESSED_REFUND_WHERE(range), _sum: { amount: true } }),
      getRiderCommissionTotals(range),
      db.vendorPayout.aggregate({ where: { status: "PAID", processedAt: genericRange }, _sum: { amount: true } }),
      // "Owed to vendors" is a running balance, never period-scoped — same
      // convention as RiderProfile.balancePoisha (see the rules box).
      db.order.aggregate({ where: { status: "DELIVERED" }, _sum: { vendorEarnings: true } }),
      db.vendorPayout.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      db.riderLedgerEntry.aggregate({ where: { type: "PAYOUT", occurredAt: genericRange }, _sum: { amountPoisha: true } }),
      db.riderProfile.aggregate({ where: { balancePoisha: { lt: 0 } }, _sum: { balancePoisha: true } }),
      db.riderProfile.aggregate({ where: { balancePoisha: { gt: 0 } }, _sum: { balancePoisha: true } }),
    ]);

  const itemSalesTk = Number(deliveredAgg._sum.subtotal ?? 0);
  const deliveryFeesChargedTk = Number(deliveredAgg._sum.deliveryFee ?? 0);
  const discountsTk = Number(deliveredAgg._sum.discount ?? 0);
  const vendorCommissionTk = Number(deliveredAgg._sum.commissionAmount ?? 0);
  const customersPaidTk = Number(deliveredAgg._sum.total ?? 0);
  const freeDeliveryCostTk = fromPoisha(freeDeliveryAgg._sum.riderEarningPoisha ?? 0);
  const refundsTk = Number(refundsAgg._sum.amount ?? 0);
  const riderCommissionTk = riderCommission.riderCommissionTk;
  const owedToVendorsAllTimeTk = Number(vendorAllTime._sum.vendorEarnings ?? 0) - Number(vendorPayoutsAllTime._sum.amount ?? 0);
  const owedToRidersAllTimeTk = Math.abs(fromPoisha(riderBalancesAllTime._sum.balancePoisha ?? 0));
  const codStillHeldAllTimeTk = fromPoisha(codHeldAllTime._sum.balancePoisha ?? 0);

  return {
    customersPaidTk,
    itemSalesTk,
    deliveryFeesChargedTk,
    freeDeliveryCostTk,
    discountsTk,
    refundsTk,
    vendorCommissionTk,
    riderCommissionTk,
    paidToVendorsTk: Number(vendorPayoutsAgg._sum.amount ?? 0),
    owedToVendorsAllTimeTk,
    paidToRidersTk: fromPoisha(riderPayoutsAgg._sum.amountPoisha ?? 0),
    owedToRidersAllTimeTk,
    netEarningsTk: vendorCommissionTk + riderCommissionTk - freeDeliveryCostTk - refundsTk,
    codStillHeldAllTimeTk,
  };
}

// =============================================================================
// 1) GROUP BY DAY / WEEK / MONTH — orders + revenue per bucket
// =============================================================================

export type FinanceSeriesRow = { key: string; label: string; orderCount: number; revenueTk: number };

export async function getFinanceSeries(buckets: { key: string; label: string; start: Date; end: Date }[]): Promise<FinanceSeriesRow[]> {
  // One query per bucket rather than a single groupBy — bucket boundaries
  // are arbitrary (week/month, Dhaka-anchored) and don't line up with any
  // column Prisma can group by directly. Bounded by enumerateBuckets' own
  // 400-bucket cap, so this never fans out unreasonably.
  return Promise.all(
    buckets.map(async (b) => {
      const agg = await db.order.aggregate({ where: { status: "DELIVERED", updatedAt: { gte: b.start, lt: b.end } }, _sum: { total: true }, _count: { _all: true } });
      return { key: b.key, label: b.label, orderCount: agg._count._all, revenueTk: Number(agg._sum.total ?? 0) };
    }),
  );
}

// =============================================================================
// 6) CHECK TABLE — old Money overview vs this page, same period
// =============================================================================

export type CheckRow = { label: string; oldValue: string; newValue: string; matches: boolean; note?: string };

/**
 * Compares this page's numbers against the existing getAdminMoneyOverview
 * for the same period ("month" — the widest preset the old system shares
 * with a finance-page quick key, so both sides are computing genuinely the
 * same window). Rows that use a different filter (refunds — see below) are
 * expected to differ and say so rather than silently disagreeing.
 */
export async function getFinanceCheckTable(): Promise<CheckRow[]> {
  const period: PeriodKey = "month";
  const start = getPeriodStart(period)!;
  const range: FinanceRange = { quick: "thisMonth", start, end: undefined, groupBy: "day", label: "This month" };

  const [old, vendorCommission, riderCommission, refunds, money] = await Promise.all([
    getAdminMoneyOverview(period),
    getVendorCommissionTotals(range),
    getRiderCommissionTotals(range),
    getFinanceRefundsSummary(range),
    getFinanceMoneySummary(range),
  ]);

  const fmt = (n: number) => n.toFixed(2);
  const rows: CheckRow[] = [
    {
      label: "Vendor commission earned (this month)",
      oldValue: fmt(old.vendor.commissionPeriodTk),
      newValue: fmt(vendorCommission.vendorCommissionTk),
      matches: Math.abs(old.vendor.commissionPeriodTk - vendorCommission.vendorCommissionTk) < 0.01,
    },
    {
      label: "Rider commission / delivery fee share earned (this month)",
      oldValue: fmt(old.rider.platformEarningsPoisha / 100),
      newValue: fmt(riderCommission.riderCommissionTk),
      matches: Math.abs(old.rider.platformEarningsPoisha / 100 - riderCommission.riderCommissionTk) < 0.01,
    },
    {
      label: "Paid to vendors (this month)",
      oldValue: fmt(old.vendor.vendorsPaidPeriodTk),
      newValue: fmt(money.paidToVendorsTk),
      matches: Math.abs(old.vendor.vendorsPaidPeriodTk - money.paidToVendorsTk) < 0.01,
    },
    {
      label: "Paid to riders (this month)",
      oldValue: fmt(old.rider.paidToRidersPoisha / 100),
      newValue: fmt(money.paidToRidersTk),
      matches: Math.abs(old.rider.paidToRidersPoisha / 100 - money.paidToRidersTk) < 0.01,
    },
    {
      label: "Owed to vendors (running balance, all time)",
      oldValue: fmt(old.vendor.vendorsOwedAllTimeTk),
      newValue: fmt(money.owedToVendorsAllTimeTk),
      matches: Math.abs(old.vendor.vendorsOwedAllTimeTk - money.owedToVendorsAllTimeTk) < 0.01,
      note:
        "Can differ by a small amount: the old Money overview sums CommissionEntry.vendorEarnings, this page sums Order.vendorEarnings directly — normally identical (written together at checkout), but at least one seeded demo order has no matching CommissionEntry row, so the old number silently excludes it while this page's doesn't. A real difference here is a worthwhile signal that an order is missing its CommissionEntry row.",
    },
    {
      label: "Owed to riders (running balance, all time)",
      oldValue: fmt(old.rider.weOweRidersPoisha / 100),
      newValue: fmt(money.owedToRidersAllTimeTk),
      matches: Math.abs(old.rider.weOweRidersPoisha / 100 - money.owedToRidersAllTimeTk) < 0.01,
    },
    {
      label: "COD cash still held by riders (running balance, all time)",
      oldValue: fmt(old.rider.stillToCollectPoisha / 100),
      newValue: fmt(money.codStillHeldAllTimeTk),
      matches: Math.abs(old.rider.stillToCollectPoisha / 100 - money.codStillHeldAllTimeTk) < 0.01,
    },
    {
      label: "Refunded amount (this month)",
      oldValue: fmt(old.refunds.totalTk),
      newValue: fmt(refunds.totalTk),
      matches: Math.abs(old.refunds.totalTk - refunds.totalTk) < 0.01,
      note:
        "Expected to differ: the old Money overview sums every Refund row regardless of status (including still-pending REQUESTED/APPROVED requests and even REJECTED ones) and filters by when the refund was requested (createdAt). This page counts only PROCESSED refunds — the ones that actually moved money — filtered by when they were processed (processedAt), since that's what 'refunded this period' should mean.",
    },
  ];

  return rows;
}
