/**
 * Date-range + group-by resolution for the admin Finance dashboard only.
 * Deliberately separate from src/lib/date/period.ts (PeriodKey: today/week/
 * month/all, no end bound, no custom range) rather than extending it — that
 * module is shared by the main admin dashboard, payments, riders, and the
 * rider's own history page, and this task is scoped to the Finance page
 * only. Pure (no "server-only", no imports) so it's trivially testable and
 * safe to use from any component.
 */

export type FinanceQuickKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "allTime" | "custom";
export const FINANCE_QUICK_KEYS: FinanceQuickKey[] = ["today", "yesterday", "thisWeek", "thisMonth", "lastMonth", "allTime", "custom"];

export type FinanceGroupBy = "day" | "week" | "month";
export const FINANCE_GROUP_BY_KEYS: FinanceGroupBy[] = ["day", "week", "month"];

export type FinanceRange = {
  quick: FinanceQuickKey;
  /** Inclusive lower bound, or undefined for "all time". */
  start: Date | undefined;
  /** Exclusive upper bound, or undefined for "no upper bound (up to now)". */
  end: Date | undefined;
  groupBy: FinanceGroupBy;
  label: string;
};

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Bangladesh is UTC+6, no DST.
const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** `now`'s calendar date (and day-of-week, 0 = Sunday) as seen on a clock in Asia/Dhaka. */
function getDhakaDateParts(now: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), dayOfWeek: DHAKA_WEEKDAY_MAP[get("weekday")] ?? 0 };
}

/** The absolute instant at which it is 00:00:00 in Asia/Dhaka on the given Dhaka calendar date. Day 0 or month 0 roll over correctly via the Date constructor (e.g. month 13 -> next January). */
function dhakaMidnightInstant(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - DHAKA_OFFSET_MS);
}

/** "YYYY-MM-DD" (Dhaka-local) -> the UTC instant of that Dhaka midnight. Accepts the exact format <input type="date"> produces. */
function parseDhakaDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  return dhakaMidnightInstant(Number(y), Number(m), Number(d));
}

/** `date`'s calendar day in Asia/Dhaka, as "YYYY-MM-DD". */
export function getDhakaDateKey(date: Date): string {
  const { year, month, day } = getDhakaDateParts(date);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekStart(now: Date): Date {
  // Saturday is the start of the Bangladesh work week — matches the
  // convention already established in src/lib/date/period.ts.
  const { year, month, day, dayOfWeek } = getDhakaDateParts(now);
  const daysSinceSaturday = (dayOfWeek + 1) % 7; // Sat=6 -> 0, Sun=0 -> 1, ... Fri=5 -> 6
  return new Date(dhakaMidnightInstant(year, month, day).getTime() - daysSinceSaturday * DAY_MS);
}

function monthStart(year: number, month: number): Date {
  return dhakaMidnightInstant(year, month, 1);
}

export type FinanceFilterParams = { quick?: string; from?: string; to?: string; groupBy?: string };

/** Resolves the quick-key/custom-range/group-by query params into concrete UTC instants. Defaults to "today"/"day" for anything missing or unrecognized. */
export function resolveFinanceRange(params: FinanceFilterParams, now = new Date()): FinanceRange {
  const groupBy: FinanceGroupBy = FINANCE_GROUP_BY_KEYS.includes(params.groupBy as FinanceGroupBy) ? (params.groupBy as FinanceGroupBy) : "day";
  const quickRaw = params.quick ?? "today";
  const { year, month, day } = getDhakaDateParts(now);
  const todayStart = dhakaMidnightInstant(year, month, day);

  if (quickRaw === "custom" || params.from || params.to) {
    const start = params.from ? parseDhakaDateInput(params.from) : undefined;
    // "to" is inclusive in the UI (a calendar date picker), so the actual
    // exclusive upper bound is the START of the day AFTER it.
    const toStart = params.to ? parseDhakaDateInput(params.to) : undefined;
    const end = toStart ? new Date(toStart.getTime() + DAY_MS) : undefined;
    return { quick: "custom", start, end, groupBy, label: "Custom range" };
  }

  const quick: FinanceQuickKey = FINANCE_QUICK_KEYS.includes(quickRaw as FinanceQuickKey) ? (quickRaw as FinanceQuickKey) : "today";

  switch (quick) {
    case "today":
      return { quick, start: todayStart, end: new Date(todayStart.getTime() + DAY_MS), groupBy, label: "Today" };
    case "yesterday": {
      const start = new Date(todayStart.getTime() - DAY_MS);
      return { quick, start, end: todayStart, groupBy, label: "Yesterday" };
    }
    case "thisWeek":
      return { quick, start: weekStart(now), end: new Date(todayStart.getTime() + DAY_MS), groupBy, label: "This week" };
    case "thisMonth":
      return { quick, start: monthStart(year, month), end: new Date(todayStart.getTime() + DAY_MS), groupBy, label: "This month" };
    case "lastMonth": {
      const lastMonthYear = month === 1 ? year - 1 : year;
      const lastMonth = month === 1 ? 12 : month - 1;
      return { quick, start: monthStart(lastMonthYear, lastMonth), end: monthStart(year, month), groupBy, label: "Last month" };
    }
    case "allTime":
      return { quick, start: undefined, end: undefined, groupBy, label: "All time" };
    default:
      return { quick: "today", start: todayStart, end: new Date(todayStart.getTime() + DAY_MS), groupBy, label: "Today" };
  }
}

export type DateBucket = { key: string; label: string; start: Date; end: Date };

/** Every day/week/month bucket between `start` (inclusive) and `end` (exclusive) — for the "group by" table. Capped at 400 buckets (a safety valve against an absurd custom range, e.g. a 50-year span grouped by day) rather than silently hanging the page. */
export function enumerateBuckets(start: Date, end: Date, groupBy: FinanceGroupBy): DateBucket[] {
  const buckets: DateBucket[] = [];
  const MAX_BUCKETS = 400;

  if (groupBy === "day") {
    let cursor = start;
    while (cursor.getTime() < end.getTime() && buckets.length < MAX_BUCKETS) {
      const bucketEnd = new Date(cursor.getTime() + DAY_MS);
      buckets.push({ key: getDhakaDateKey(cursor), label: getDhakaDateKey(cursor), start: cursor, end: bucketEnd });
      cursor = bucketEnd;
    }
    return buckets;
  }

  if (groupBy === "week") {
    let cursor = weekStart(start);
    while (cursor.getTime() < end.getTime() && buckets.length < MAX_BUCKETS) {
      const bucketEnd = new Date(cursor.getTime() + 7 * DAY_MS);
      buckets.push({ key: getDhakaDateKey(cursor), label: `Week of ${getDhakaDateKey(cursor)}`, start: cursor, end: bucketEnd });
      cursor = bucketEnd;
    }
    return buckets;
  }

  // month
  const { year: startYear, month: startMonth } = getDhakaDateParts(start);
  let y = startYear;
  let m = startMonth;
  let cursor = monthStart(y, m);
  while (cursor.getTime() < end.getTime() && buckets.length < MAX_BUCKETS) {
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    const bucketEnd = monthStart(nextYear, nextMonth);
    buckets.push({ key: `${y}-${String(m).padStart(2, "0")}`, label: `${y}-${String(m).padStart(2, "0")}`, start: cursor, end: bucketEnd });
    y = nextYear;
    m = nextMonth;
    cursor = bucketEnd;
  }
  return buckets;
}
