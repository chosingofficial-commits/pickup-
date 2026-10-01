import "server-only";
import { db } from "@/lib/db";
import { getPeriodStart, type PeriodKey } from "@/lib/date/period";
import { getRiderPaymentSummary, type RiderPaymentSummary } from "@/lib/rider/ledger";

/**
 * Online payments (non-COD) for the admin Payments page — "real" and
 * "sandbox" always kept separate so a mock/test payment is never counted as
 * actual revenue (see the Oct 2026 online-payments investigation: every
 * online payment ever recorded in this app has in fact been sandbox).
 */
export async function getOnlinePaymentsList(period: PeriodKey) {
  const since = getPeriodStart(period);
  return db.payment.findMany({
    where: { provider: { not: "COD" }, ...(since ? { createdAt: { gte: since } } : {}) },
    include: {
      orderGroup: {
        include: {
          customer: { select: { name: true, phone: true } },
          orders: { select: { orderNumber: true, vendor: { select: { businessName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export type OnlinePaymentsSummary = { realTk: number; realCount: number; sandboxTk: number; sandboxCount: number };

export async function getOnlinePaymentsSummary(period: PeriodKey): Promise<OnlinePaymentsSummary> {
  const since = getPeriodStart(period);
  const paidFilter = { provider: { not: "COD" as const }, status: "PAID" as const, ...(since ? { paidAt: { gte: since } } : {}) };
  const [real, sandbox] = await Promise.all([
    db.payment.aggregate({ where: { ...paidFilter, isSandbox: false }, _sum: { amount: true }, _count: { _all: true } }),
    db.payment.aggregate({ where: { ...paidFilter, isSandbox: true }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  return {
    realTk: Number(real._sum.amount ?? 0),
    realCount: real._count._all,
    sandboxTk: Number(sandbox._sum.amount ?? 0),
    sandboxCount: sandbox._count._all,
  };
}

export type VendorPaymentSummary = { commissionPeriodTk: number; vendorsPaidPeriodTk: number; vendorsOwedAllTimeTk: number };

/**
 * Platform-wide vendor money — the aggregate version of what
 * getVendorDashboardStats already computes per-vendor. "Owed to vendors" is
 * a running balance (like a rider's balancePoisha), never period-filtered —
 * only money that actually moves (commission earned, payouts paid) is.
 */
export async function getVendorPaymentSummary(period: PeriodKey): Promise<VendorPaymentSummary> {
  const since = getPeriodStart(period);
  const deliveredFilter = { order: { status: "DELIVERED" as const, updatedAt: since ? { gte: since } : undefined } };

  const [commissionAgg, paidAgg, allTimeEarningsAgg, allTimePaidAgg] = await Promise.all([
    db.commissionEntry.aggregate({ where: deliveredFilter, _sum: { commissionAmount: true } }),
    db.vendorPayout.aggregate({ where: { status: "PAID", processedAt: since ? { gte: since } : undefined }, _sum: { amount: true } }),
    db.commissionEntry.aggregate({ where: { order: { status: "DELIVERED" } }, _sum: { vendorEarnings: true } }),
    db.vendorPayout.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  return {
    commissionPeriodTk: Number(commissionAgg._sum.commissionAmount ?? 0),
    vendorsPaidPeriodTk: Number(paidAgg._sum.amount ?? 0),
    vendorsOwedAllTimeTk: Number(allTimeEarningsAgg._sum.vendorEarnings ?? 0) - Number(allTimePaidAgg._sum.amount ?? 0),
  };
}

export type AdIncomeSummary = { realTk: number; sandboxTk: number };

export async function getAdIncomeSummary(period: PeriodKey): Promise<AdIncomeSummary> {
  const since = getPeriodStart(period);
  const paidFilter = { status: "PAID" as const, ...(since ? { paidAt: { gte: since } } : {}) };
  const [real, sandbox] = await Promise.all([
    db.adPayment.aggregate({ where: { ...paidFilter, isSandbox: false }, _sum: { amount: true } }),
    db.adPayment.aggregate({ where: { ...paidFilter, isSandbox: true }, _sum: { amount: true } }),
  ]);
  return { realTk: Number(real._sum.amount ?? 0), sandboxTk: Number(sandbox._sum.amount ?? 0) };
}

export type RefundsSummary = { totalTk: number; count: number };

export async function getRefundsSummary(period: PeriodKey): Promise<RefundsSummary> {
  const since = getPeriodStart(period);
  const agg = await db.refund.aggregate({
    where: since ? { createdAt: { gte: since } } : {},
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { totalTk: Number(agg._sum.amount ?? 0), count: agg._count._all };
}

export type AdminMoneyOverview = {
  online: OnlinePaymentsSummary;
  vendor: VendorPaymentSummary;
  ad: AdIncomeSummary;
  refunds: RefundsSummary;
  rider: RiderPaymentSummary;
  /** Pick Up's own realized earnings this period: vendor commission + delivery fee share + real (non-sandbox) ad income. */
  platformEarningsTotalTk: number;
};

export async function getAdminMoneyOverview(period: PeriodKey): Promise<AdminMoneyOverview> {
  const [online, vendor, ad, refunds, rider] = await Promise.all([
    getOnlinePaymentsSummary(period),
    getVendorPaymentSummary(period),
    getAdIncomeSummary(period),
    getRefundsSummary(period),
    getRiderPaymentSummary(period),
  ]);

  const platformDeliveryShareTk = rider.platformEarningsPoisha / 100;
  const platformEarningsTotalTk = vendor.commissionPeriodTk + platformDeliveryShareTk + ad.realTk;

  return { online, vendor, ad, refunds, rider, platformEarningsTotalTk };
}
