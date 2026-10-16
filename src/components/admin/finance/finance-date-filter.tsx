import Link from "next/link";
import type { FinanceQuickKey, FinanceGroupBy } from "@/lib/admin/finance-period";

const QUICK_OPTIONS: { key: FinanceQuickKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "allTime", label: "All time" },
];

const GROUP_BY_OPTIONS: { key: FinanceGroupBy; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

/** YYYY-MM-DD in Asia/Dhaka, for pre-filling the custom-range date inputs from the resolved range's own bounds. */
function toDateInputValue(date: Date | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function FinanceDateFilter({
  quick,
  groupBy,
  from,
  to,
}: {
  quick: FinanceQuickKey;
  groupBy: FinanceGroupBy;
  /** The resolved range's own start/end, so the custom-range inputs show what's actually active even when a quick key (not "custom") produced them. */
  from: Date | undefined;
  to: Date | undefined;
}) {
  // `to` is an EXCLUSIVE upper bound (start of the day after); the date
  // input showing it back to the admin needs the last INCLUDED day instead.
  const toInclusive = to ? new Date(to.getTime() - 1) : undefined;

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ quick, groupBy, ...overrides });
    return `/admin/finance?${params.toString()}`;
  };
  const groupByHref = (newGroupBy: FinanceGroupBy) => {
    const overrides: Record<string, string> = { groupBy: newGroupBy };
    if (from) overrides.from = toDateInputValue(from);
    if (toInclusive) overrides.to = toDateInputValue(toInclusive);
    return buildHref(overrides);
  };

  return (
    <div className="space-y-3 rounded-card border border-border-brand bg-white p-4">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_OPTIONS.map((o) => (
          <Link
            key={o.key}
            href={buildHref({ quick: o.key })}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold ${
              quick === o.key ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark hover:bg-brand-bg"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      <form method="GET" action="/admin/finance" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="quick" value="custom" />
        <input type="hidden" name="groupBy" value={groupBy} />
        <div>
          <label htmlFor="finance-from" className="mb-1 block text-xs font-semibold text-brand-dark">
            Custom range — from
          </label>
          <input id="finance-from" name="from" type="date" defaultValue={toDateInputValue(from)} className="h-9 rounded-control border border-border-brand px-2.5 text-xs" />
        </div>
        <div>
          <label htmlFor="finance-to" className="mb-1 block text-xs font-semibold text-brand-dark">
            to
          </label>
          <input id="finance-to" name="to" type="date" defaultValue={toDateInputValue(toInclusive)} className="h-9 rounded-control border border-border-brand px-2.5 text-xs" />
        </div>
        <button type="submit" className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">
          Apply custom range
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-brand-dark">Group by:</span>
        {GROUP_BY_OPTIONS.map((o) => (
          <Link
            key={o.key}
            href={groupByHref(o.key)}
            className={`rounded-control px-3 py-1 font-semibold ${groupBy === o.key ? "bg-brand-primary text-white" : "border border-border-brand text-brand-dark hover:bg-brand-bg"}`}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
