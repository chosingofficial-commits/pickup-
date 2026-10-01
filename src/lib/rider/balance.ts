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

// Period-window math (getPeriodStart/PeriodKey) moved to lib/date/period.ts —
// it's generic Bangladesh-time reporting-window logic, not rider-specific,
// and is now also used by vendor/admin money queries. Re-exported here so
// existing rider-module imports keep working.
export { getPeriodStart, PERIOD_KEYS, type PeriodKey } from "@/lib/date/period";
