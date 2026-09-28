import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDuplicateNationalIdNumbers } from "@/lib/rider/queries";
import { getAllRidersBalanceSummary, getRiderPaymentSummary } from "@/lib/rider/ledger";
import { getRiderBalanceStatus, type RiderBalanceStatus, PERIOD_KEYS, type PeriodKey } from "@/lib/rider/balance";
import { RiderCard } from "@/components/admin/rider-card";
import { RiderPaymentSummary } from "@/components/admin/rider-payment-summary";

export const metadata: Metadata = { title: "Riders" };

type StatusFilter = RiderBalanceStatus | "all";
const STATUS_FILTERS: StatusFilter[] = ["all", "owes", "weOwe", "paidUp"];
const STATUS_LABELS: Record<StatusFilter, string> = { all: "All", owes: "Owes you", weOwe: "You owe", paidUp: "Paid up" };

export default async function AdminRidersPage({ searchParams }: { searchParams: Promise<{ period?: string; status?: string }> }) {
  const params = await searchParams;
  const period: PeriodKey = (PERIOD_KEYS as string[]).includes(params.period ?? "") ? (params.period as PeriodKey) : "today";
  const status: StatusFilter = (STATUS_FILTERS as string[]).includes(params.status ?? "") ? (params.status as StatusFilter) : "all";
  const statusQuery = status === "all" ? "" : `&status=${status}`;

  const riders = await db.riderProfile.findMany({
    where: { isApproved: true },
    include: { user: { select: { name: true, phone: true, createdAt: true } }, _count: { select: { deliveries: true } } },
    orderBy: { createdAt: "desc" },
  });
  const [duplicateNids, todayCollectedFor, paymentSummary] = await Promise.all([
    getDuplicateNationalIdNumbers(),
    getAllRidersBalanceSummary(riders.map((r) => r.id)),
    getRiderPaymentSummary(period),
  ]);

  const filteredRiders = status === "all" ? riders : riders.filter((r) => getRiderBalanceStatus(r.balancePoisha) === status);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Riders</h1>

      <RiderPaymentSummary period={period} statusQuery={statusQuery} summary={paymentSummary} />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/riders?period=${period}${s === "all" ? "" : `&status=${s}`}`}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold ${
              s === status ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark hover:bg-brand-bg"
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {filteredRiders.length === 0 ? (
        <p className="text-sm text-gray-500">{riders.length === 0 ? "No active riders yet." : "No riders match this filter."}</p>
      ) : (
        <div className="space-y-3">
          {filteredRiders.map((rider) => (
            <RiderCard
              key={rider.id}
              mode="approved"
              rider={{
                id: rider.id,
                name: rider.user.name,
                phone: rider.user.phone,
                vehicleType: rider.vehicleType,
                createdAt: rider.user.createdAt.toISOString(),
                hasNationalIdDoc: !!rider.nationalIdDocKey,
                nationalIdNo: rider.nationalIdNo,
                licenseCheckedInOffice: rider.licenseCheckedInOffice,
                photoCheckedInOffice: rider.photoCheckedInOffice,
                licenseNumber: rider.licenseNumber,
                adminNote: rider.adminNote,
                isDuplicateNid: !!rider.nationalIdNo && duplicateNids.has(rider.nationalIdNo),
                isOnline: rider.isOnline,
                deliveryCount: rider._count.deliveries,
                balancePoisha: rider.balancePoisha,
                todayCollectedPoisha: todayCollectedFor(rider.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
