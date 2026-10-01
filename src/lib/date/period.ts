/**
 * Pure, no "server-only" — used by both server code (list/filter queries)
 * and client components, so it must be safe to bundle into the client
 * without pulling in DB-touching code.
 */
export type PeriodKey = "today" | "week" | "month" | "all";
export const PERIOD_KEYS: PeriodKey[] = ["today", "week", "month", "all"];

// Asia/Dhaka is a fixed UTC+6 offset (no DST) — see lib/restaurant/status.ts's
// nowInDhaka() for the same technique applied to opening-hours checks.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** `now`'s calendar date (and day-of-week, 0 = Sunday) as seen on a clock in Asia/Dhaka. */
function getDhakaDateParts(now: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dayOfWeek: DHAKA_WEEKDAY_MAP[get("weekday")] ?? 0,
  };
}

/** The absolute instant at which it is 00:00:00 in Asia/Dhaka on the given Dhaka calendar date. */
function dhakaMidnightInstant(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - DHAKA_OFFSET_MS);
}

/**
 * Start of the requested reporting window, anchored to Asia/Dhaka calendar
 * days regardless of the server's own time zone — otherwise "Today" on a
 * UTC server would start at 6am Dhaka time, wrongly excluding early-morning
 * activity from "today". "Week" starts Saturday (the Bangladesh work
 * week) — there's no pre-existing week-start convention elsewhere in this
 * codebase to match. Returns undefined for "all time" (no lower bound).
 * Pure and takes `now` so it's testable without mocking the system clock.
 */
export function getPeriodStart(period: PeriodKey, now = new Date()): Date | undefined {
  if (period === "all") return undefined;

  const { year, month, day, dayOfWeek } = getDhakaDateParts(now);
  const todayStart = dhakaMidnightInstant(year, month, day);
  if (period === "today") return todayStart;

  if (period === "week") {
    const daysSinceSaturday = (dayOfWeek + 1) % 7; // Sat=6 -> 0, Sun=0 -> 1, ... Fri=5 -> 6
    return new Date(todayStart.getTime() - daysSinceSaturday * DAY_MS);
  }

  return dhakaMidnightInstant(year, month, 1);
}
