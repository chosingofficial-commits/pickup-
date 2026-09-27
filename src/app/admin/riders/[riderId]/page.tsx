import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getRiderBalance, getRiderLedger, fromPoisha } from "@/lib/rider/ledger";
import { RiderHandoverForm, RiderPayoutForm, RiderAdjustmentForm, RiderCommissionRateForm } from "@/components/admin/rider-ledger-forms";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Rider ledger" };

const LEDGER_TYPE_LABELS: Record<string, string> = {
  DELIVERY_EARNING: "Delivery",
  DELIVERY_REVERSAL: "Delivery reversed",
  CASH_HANDOVER: "Cash handover",
  PAYOUT: "Payout",
  ADJUSTMENT: "Adjustment",
};

export default async function AdminRiderDetailPage({ params }: { params: Promise<{ riderId: string }> }) {
  const { riderId } = await params;
  const rider = await db.riderProfile.findUnique({ where: { id: riderId }, include: { user: { select: { name: true, phone: true } } } });
  if (!rider) notFound();

  const [balancePoisha, ledger] = await Promise.all([getRiderBalance(riderId), getRiderLedger(riderId)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/riders" className="text-xs text-brand-primary hover:underline">
          ← All riders
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-bold text-brand-dark">{rider.user.name}</h1>
        <p className="text-sm text-gray-500">{rider.user.phone}</p>
      </div>

      <div className="rounded-card border border-border-brand bg-white p-4">
        <p className="text-xs text-gray-500">Current balance</p>
        <p className="font-heading text-2xl font-bold text-brand-dark">
          {balancePoisha === 0 ? "All settled" : formatBDT(Math.abs(fromPoisha(balancePoisha)))}
        </p>
        {balancePoisha !== 0 && <p className="text-xs text-gray-500">{balancePoisha > 0 ? "Rider owes the platform" : "Platform owes the rider"}</p>}
      </div>

      <RiderCommissionRateForm riderId={riderId} currentRatePct={Number(rider.commissionRatePct)} />

      <div className="grid gap-3 sm:grid-cols-3">
        <RiderHandoverForm riderId={riderId} riderName={rider.user.name} />
        <RiderPayoutForm riderId={riderId} riderName={rider.user.name} />
        <RiderAdjustmentForm riderId={riderId} riderName={rider.user.name} />
      </div>

      <div>
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">Ledger</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-500">No ledger entries yet.</p>
        ) : (
          <div className="space-y-2">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-3 text-sm">
                <div>
                  <p className="font-semibold text-brand-dark">
                    {LEDGER_TYPE_LABELS[entry.type] ?? entry.type}
                    {entry.delivery?.order && ` · ${entry.delivery.order.vendor.businessName} (${entry.delivery.order.orderNumber})`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.occurredAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                    {entry.payoutMethod && ` · ${entry.payoutMethod}`}
                    {entry.referenceNo && ` · Ref: ${entry.referenceNo}`}
                    {entry.note && ` · ${entry.note}`}
                    {entry.createdByUser && ` · by ${entry.createdByUser.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-brand-dark">{formatBDT(fromPoisha(entry.amountPoisha))}</p>
                  <Badge variant={entry.balanceImpactPoisha >= 0 ? "warning" : "success"}>
                    {entry.balanceImpactPoisha >= 0 ? "+" : "-"}
                    {formatBDT(Math.abs(fromPoisha(entry.balanceImpactPoisha)))}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
