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

describe("getPeriodStart", () => {
  // Wednesday, 2026-09-30, 15:30 local time.
  const wednesday = new Date(2026, 8, 30, 15, 30);

  it("returns undefined for all time (no lower bound)", () => {
    expect(getPeriodStart("all", wednesday)).toBeUndefined();
  });

  it("returns midnight of the same day for today", () => {
    const start = getPeriodStart("today", wednesday)!;
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(30);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("returns the preceding Monday midnight for week", () => {
    const start = getPeriodStart("week", wednesday)!;
    expect(start.getDate()).toBe(28); // Monday 2026-09-28
    expect(start.getHours()).toBe(0);
  });

  it("treats Sunday as the last day of its week, not the start of a new one", () => {
    const sunday = new Date(2026, 8, 27, 10, 0); // Sunday 2026-09-27
    const start = getPeriodStart("week", sunday)!;
    expect(start.getDate()).toBe(21); // Monday 2026-09-21
  });

  it("returns the 1st of the current month at midnight for month", () => {
    const start = getPeriodStart("month", wednesday)!;
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(8);
    expect(start.getHours()).toBe(0);
  });
});
