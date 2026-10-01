import Link from "next/link";
import type { PeriodKey } from "@/lib/date/period";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

/** Bangladesh-time period switcher, shared by every admin money page (riders, payments, the dashboard overview) so they all filter the same way. */
export function PeriodFilter({ basePath, period, extraQuery = "" }: { basePath: string; period: PeriodKey; extraQuery?: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PERIODS.map((p) => (
        <Link
          key={p.key}
          href={`${basePath}?period=${p.key}${extraQuery}`}
          className={`rounded-control px-3 py-1.5 text-xs font-semibold ${
            p.key === period ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark hover:bg-brand-bg"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
