/**
 * Pure, no "server-only" — used by both server code (list/filter queries)
 * and client components (RiderCard's balance badge), so it must be safe to
 * bundle into the client without pulling in DB-touching code.
 */
export type RiderBalanceStatus = "owes" | "weOwe" | "paidUp";

export function getRiderBalanceStatus(balancePoisha: number): RiderBalanceStatus {
  if (balancePoisha > 0) return "owes";
  if (balancePoisha < 0) return "weOwe";
  return "paidUp";
}

export type PeriodKey = "today" | "week" | "month" | "all";
export const PERIOD_KEYS: PeriodKey[] = ["today", "week", "month", "all"];

/**
 * Start of the requested reporting window, or undefined for "all time" (no
 * lower bound). "week" is the current ISO week (Monday 00:00), "month" is
 * the 1st of the current calendar month — pure and takes `now` so it's
 * testable without mocking the system clock.
 */
export function getPeriodStart(period: PeriodKey, now = new Date()): Date | undefined {
  if (period === "all") return undefined;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (period === "today") return startOfToday;

  if (period === "week") {
    const day = startOfToday.getDay(); // 0 = Sunday
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(startOfToday);
    monday.setDate(monday.getDate() - daysSinceMonday);
    return monday;
  }

  return new Date(now.getFullYear(), now.getMonth(), 1);
}
