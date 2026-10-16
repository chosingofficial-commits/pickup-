import { describe, it, expect } from "vitest";
import { resolveFinanceRange, enumerateBuckets, getDhakaDateKey } from "./finance-period";

// Same reference instant as src/lib/date/period.test.ts, for easy
// cross-comparison: Wednesday 2026-09-30, 15:30 Dhaka time.
const NOW = new Date("2026-09-30T09:30:00Z");

describe("resolveFinanceRange", () => {
  it("defaults to today/day when nothing is given", () => {
    const range = resolveFinanceRange({}, NOW);
    expect(range.quick).toBe("today");
    expect(range.groupBy).toBe("day");
    expect(range.start).toEqual(new Date("2026-09-29T18:00:00Z"));
    expect(range.end).toEqual(new Date("2026-09-30T18:00:00Z"));
  });

  it("yesterday is the full Dhaka calendar day before today", () => {
    const range = resolveFinanceRange({ quick: "yesterday" }, NOW);
    expect(range.start).toEqual(new Date("2026-09-28T18:00:00Z"));
    expect(range.end).toEqual(new Date("2026-09-29T18:00:00Z"));
  });

  it("this week starts Saturday and ends at the start of tomorrow (includes all of today)", () => {
    const range = resolveFinanceRange({ quick: "thisWeek" }, NOW);
    expect(range.start).toEqual(new Date("2026-09-25T18:00:00Z")); // Sat 2026-09-26 Dhaka midnight
    expect(range.end).toEqual(new Date("2026-09-30T18:00:00Z"));
  });

  it("this month starts on the 1st and ends at the start of tomorrow", () => {
    const range = resolveFinanceRange({ quick: "thisMonth" }, NOW);
    expect(range.start).toEqual(new Date("2026-08-31T18:00:00Z")); // 2026-09-01 Dhaka midnight
    expect(range.end).toEqual(new Date("2026-09-30T18:00:00Z"));
  });

  it("last month is the entire previous calendar month", () => {
    const range = resolveFinanceRange({ quick: "lastMonth" }, NOW);
    expect(range.start).toEqual(new Date("2026-07-31T18:00:00Z")); // 2026-08-01 Dhaka midnight
    expect(range.end).toEqual(new Date("2026-08-31T18:00:00Z")); // 2026-09-01 Dhaka midnight
  });

  it("last month correctly wraps across a year boundary in January", () => {
    const januaryNow = new Date("2026-01-15T09:30:00Z"); // mid-January Dhaka
    const range = resolveFinanceRange({ quick: "lastMonth" }, januaryNow);
    expect(range.start).toEqual(new Date("2025-11-30T18:00:00Z")); // 2025-12-01 Dhaka midnight
    expect(range.end).toEqual(new Date("2025-12-31T18:00:00Z")); // 2026-01-01 Dhaka midnight
  });

  it("all time has no lower or upper bound", () => {
    const range = resolveFinanceRange({ quick: "allTime" }, NOW);
    expect(range.start).toBeUndefined();
    expect(range.end).toBeUndefined();
  });

  it("a custom range uses the 'from' date's Dhaka midnight and the 'to' date's NEXT Dhaka midnight (inclusive end)", () => {
    const range = resolveFinanceRange({ quick: "custom", from: "2026-09-01", to: "2026-09-05" }, NOW);
    expect(range.quick).toBe("custom");
    expect(range.start).toEqual(new Date("2026-08-31T18:00:00Z"));
    expect(range.end).toEqual(new Date("2026-09-05T18:00:00Z")); // start of 2026-09-06 Dhaka
  });

  it("a custom range with only 'from' has no upper bound", () => {
    const range = resolveFinanceRange({ from: "2026-09-01" }, NOW);
    expect(range.start).toEqual(new Date("2026-08-31T18:00:00Z"));
    expect(range.end).toBeUndefined();
  });

  it("falls back to today for an unrecognized quick key", () => {
    const range = resolveFinanceRange({ quick: "bogus" }, NOW);
    expect(range.quick).toBe("today");
  });

  it("respects an explicit groupBy", () => {
    expect(resolveFinanceRange({ groupBy: "week" }, NOW).groupBy).toBe("week");
    expect(resolveFinanceRange({ groupBy: "month" }, NOW).groupBy).toBe("month");
    expect(resolveFinanceRange({ groupBy: "bogus" }, NOW).groupBy).toBe("day");
  });
});

describe("enumerateBuckets", () => {
  it("produces one bucket per day, Dhaka-anchored", () => {
    const start = new Date("2026-09-28T18:00:00Z"); // 2026-09-29 Dhaka midnight
    const end = new Date("2026-10-01T18:00:00Z"); // 2026-10-02 Dhaka midnight (3 days later)
    const buckets = enumerateBuckets(start, end, "day");
    expect(buckets.map((b) => b.key)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });

  it("produces one bucket per week, each starting Saturday", () => {
    const start = new Date("2026-09-25T18:00:00Z"); // Sat 2026-09-26 Dhaka
    const end = new Date("2026-10-09T18:00:00Z"); // Sat 2026-10-10 Dhaka (2 full weeks later)
    const buckets = enumerateBuckets(start, end, "week");
    expect(buckets).toHaveLength(2);
    expect(buckets[0]!.key).toBe("2026-09-26");
    expect(buckets[1]!.key).toBe("2026-10-03");
  });

  it("produces one bucket per calendar month", () => {
    const start = new Date("2026-07-31T18:00:00Z"); // 2026-08-01 Dhaka
    const end = new Date("2026-10-31T18:00:00Z"); // 2026-11-01 Dhaka (3 months later)
    const buckets = enumerateBuckets(start, end, "month");
    expect(buckets.map((b) => b.key)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("caps at 400 buckets for an absurd range instead of hanging", () => {
    const start = new Date("1990-01-01T00:00:00Z");
    const end = new Date("2030-01-01T00:00:00Z");
    expect(enumerateBuckets(start, end, "day").length).toBe(400);
  });
});

describe("getDhakaDateKey", () => {
  it("formats a UTC instant as its Dhaka-local calendar date", () => {
    expect(getDhakaDateKey(NOW)).toBe("2026-09-30");
  });

  it("rolls over to the next Dhaka day for a late-UTC instant", () => {
    expect(getDhakaDateKey(new Date("2026-09-29T19:00:00Z"))).toBe("2026-09-30"); // 01:00 Dhaka next day
  });
});
