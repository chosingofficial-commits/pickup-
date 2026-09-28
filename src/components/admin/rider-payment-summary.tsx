import Link from "next/link";
import { formatBDT } from "@/lib/utils";
import type { PeriodKey } from "@/lib/rider/balance";
import type { RiderPaymentSummary as RiderPaymentSummaryData } from "@/lib/rider/ledger";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

function Stat({ label, poisha, hint }: { label: string; poisha: number; hint?: string }) {
  return (
    <div className="rounded-control bg-surface-muted p-3">
      <p className="text-xs font-semibold text-brand-dark">{label}</p>
      <p className="font-heading text-xl font-bold text-brand-dark">{formatBDT(poisha / 100)}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

export function RiderPaymentSummary({ period, statusQuery, summary }: { period: PeriodKey; statusQuery: string; summary: RiderPaymentSummaryData }) {
  return (
    <div className="space-y-3 rounded-card border border-border-brand bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-bold text-brand-dark">Rider payments</h2>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/riders?period=${p.key}${statusQuery}`}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold ${
                p.key === period ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark hover:bg-brand-bg"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Your earnings from riders" poisha={summary.platformEarningsPoisha} hint="Platform's delivery commission" />
        <Stat label="Cash collected by riders" poisha={summary.cashCollectedPoisha} hint="Vendors' money for goods — not platform earnings" />
        <Stat label="Received from riders" poisha={summary.receivedFromRidersPoisha} />
        <Stat label="Paid to riders" poisha={summary.paidToRidersPoisha} />
        <Stat label="Still to collect" poisha={summary.stillToCollectPoisha} hint="Current balances, all time" />
        <Stat label="You owe riders" poisha={summary.weOweRidersPoisha} hint="Current balances, all time" />
      </div>
    </div>
  );
}
