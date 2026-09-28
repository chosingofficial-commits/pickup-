import { describe, it, expect } from "vitest";
import { getRiderBalanceStatus, getPeriodStart } from "./balance";

describe("getRiderBalanceStatus", () => {
  it("is paidUp when the balance is exactly zero", () => {
    expect(getRiderBalanceStatus(0)).toBe("paidUp");
  });

  it("is owes when the rider owes the platform (positive balance)", () => {
    expect(getRiderBalanceStatus(20625)).toBe("owes");
  });

  it("is weOwe when the platform owes the rider (negative balance)", () => {
    expect(getRiderBalanceStatus(-500)).toBe("weOwe");
  });
});

// All instants below are UTC — Asia/Dhaka is a fixed UTC+6 offset (no DST),
// so "Dhaka local time" = UTC + 6 hours throughout (same convention as
// lib/restaurant/status.test.ts). "now" is Wednesday 2026-09-30, 15:30 Dhaka.
const NOW = new Date("2026-09-30T09:30:00Z");

describe("getPeriodStart", () => {
  it("returns undefined for all time (no lower bound)", () => {
    expect(getPeriodStart("all", NOW)).toBeUndefined();
  });

  it("returns Dhaka midnight of the current Dhaka calendar day for today — not the server's own midnight", () => {
    // Dhaka midnight on 2026-09-30 is 2026-09-29T18:00:00Z (18:00 UTC the
    // day before) — a server running in UTC would naively compute
    // 2026-09-30T00:00:00Z instead, which is 6am Dhaka time, 6 hours late.
    expect(getPeriodStart("today", NOW)).toEqual(new Date("2026-09-29T18:00:00Z"));
  });

  it("counts a delivery at 1am Dhaka time as part of today", () => {
    const todayStart = getPeriodStart("today", NOW)!;
    const deliveryAt1amDhaka = new Date("2026-09-29T19:00:00Z"); // 2026-09-30 01:00 Dhaka
    expect(deliveryAt1amDhaka.getTime()).toBeGreaterThanOrEqual(todayStart.getTime());
  });

  it("does not count a delivery from 11pm Dhaka time the previous day as today", () => {
    const todayStart = getPeriodStart("today", NOW)!;
    const deliveryAt11pmPrevDayDhaka = new Date("2026-09-29T17:00:00Z"); // 2026-09-29 23:00 Dhaka
    expect(deliveryAt11pmPrevDayDhaka.getTime()).toBeLessThan(todayStart.getTime());
  });

  it("starts the week on Saturday (the Bangladesh work week)", () => {
    // Wednesday 2026-09-30 Dhaka -> the preceding Saturday is 2026-09-26,
    // whose Dhaka midnight is 2026-09-25T18:00:00Z.
    expect(getPeriodStart("week", NOW)).toEqual(new Date("2026-09-25T18:00:00Z"));
  });

  it("treats Saturday itself as the start of its own week", () => {
    const saturdayDhaka = new Date("2026-09-26T09:30:00Z"); // Sat 2026-09-26, 15:30 Dhaka
    expect(getPeriodStart("week", saturdayDhaka)).toEqual(new Date("2026-09-25T18:00:00Z"));
  });

  it("returns the 1st of the current Dhaka calendar month at Dhaka midnight", () => {
    expect(getPeriodStart("month", NOW)).toEqual(new Date("2026-08-31T18:00:00Z"));
  });
});
