import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getRestaurantStatus, type WeeklyHour } from "./status";

// All instants below are UTC — Asia/Dhaka is a fixed UTC+6 offset (no DST),
// so "Dhaka local time" = UTC + 6 hours throughout.
const WEDNESDAY_14_00_DHAKA = new Date("2024-01-03T08:00:00Z"); // Wed 14:00 Dhaka
const WEDNESDAY_23_00_DHAKA = new Date("2024-01-03T17:00:00Z"); // Wed 23:00 Dhaka
const THURSDAY_23_30_DHAKA = new Date("2024-01-04T17:30:00Z"); // Thu 23:30 Dhaka
const THURSDAY_01_00_DHAKA = new Date("2024-01-03T19:00:00Z"); // Thu 01:00 Dhaka (crosses UTC midnight)

const regularHours: WeeklyHour[] = [
  { dayOfWeek: 0, opensAt: "10:00", closesAt: "22:00", isClosed: false },
  { dayOfWeek: 1, opensAt: "10:00", closesAt: "22:00", isClosed: false },
  { dayOfWeek: 2, opensAt: "10:00", closesAt: "22:00", isClosed: false },
  { dayOfWeek: 3, opensAt: "10:00", closesAt: "22:00", isClosed: false },
  { dayOfWeek: 4, opensAt: "22:00", closesAt: "02:00", isClosed: false }, // overnight Thursday
  { dayOfWeek: 5, opensAt: "10:00", closesAt: "22:00", isClosed: false },
  { dayOfWeek: 6, opensAt: "10:00", closesAt: "22:00", isClosed: false },
];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("getRestaurantStatus — within opening hours", () => {
  it("is open during configured hours", () => {
    vi.setSystemTime(WEDNESDAY_14_00_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(true);
    expect(status.canAcceptImmediateOrders).toBe(true);
  });

  it("is closed outside configured hours", () => {
    vi.setSystemTime(WEDNESDAY_23_00_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(false);
    expect(status.reason).toBe("outside_hours");
  });
});

describe("getRestaurantStatus — overnight windows", () => {
  it("is open right after the overnight window starts", () => {
    vi.setSystemTime(THURSDAY_23_30_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(true);
  });

  it("is still open just before the overnight window ends, correctly resolving Dhaka's calendar day across UTC midnight", () => {
    vi.setSystemTime(THURSDAY_01_00_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(true);
  });
});

describe("getRestaurantStatus — manual overrides", () => {
  it("is closed when manually closed, even during opening hours", () => {
    vi.setSystemTime(WEDNESDAY_14_00_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: true, temporaryClosureUntil: null, scheduledOrderingEnabled: true, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(false);
    expect(status.reason).toBe("manually_closed");
    expect(status.canAcceptScheduledOrders).toBe(true);
  });

  it("is closed during a temporary closure window", () => {
    vi.setSystemTime(WEDNESDAY_14_00_DHAKA);
    const future = new Date(WEDNESDAY_14_00_DHAKA.getTime() + 60 * 60 * 1000);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: future, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(false);
    expect(status.reason).toBe("temporarily_closed");
  });

  it("reopens once a past temporary closure has elapsed", () => {
    vi.setSystemTime(WEDNESDAY_14_00_DHAKA);
    const past = new Date(WEDNESDAY_14_00_DHAKA.getTime() - 60 * 60 * 1000);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: past, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.isOpenNow).toBe(true);
  });
});

describe("getRestaurantStatus — scheduled ordering while closed", () => {
  it("cannot accept immediate orders while closed, but can accept scheduled ones when enabled", () => {
    vi.setSystemTime(WEDNESDAY_23_00_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: true, weeklyHours: regularHours });
    expect(status.canAcceptImmediateOrders).toBe(false);
    expect(status.canAcceptScheduledOrders).toBe(true);
  });
});

describe("getRestaurantStatus — nextOpen", () => {
  it("says 'today' when it's still before today's opening time", () => {
    vi.setSystemTime(new Date("2024-01-03T02:00:00Z")); // Wed 08:00 Dhaka, opens 10:00
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.nextOpen).toEqual({ label: "today", time: "10:00 AM" });
  });

  // Regression test for the bug this replaces: it used to report today's own
  // opensAt even once that time had already passed, i.e. "opens at 10:00 AM"
  // while it's 11pm and already closed for the day — technically true at
  // some point today, but useless and misleading by the time anyone reads it.
  it("says 'tomorrow' (not today's already-passed opening time) once past today's closing time", () => {
    vi.setSystemTime(WEDNESDAY_23_00_DHAKA); // Wed 23:00 Dhaka, closes 22:00; Thursday opens 22:00 (overnight)
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.nextOpen).toEqual({ label: "tomorrow", time: "10:00 PM" });
  });

  it("skips closed days and names the correct weekday", () => {
    const hoursWithClosedDays: WeeklyHour[] = regularHours.map((h) => (h.dayOfWeek === 4 || h.dayOfWeek === 5 ? { ...h, isClosed: true } : h));
    vi.setSystemTime(WEDNESDAY_23_00_DHAKA); // Wed closed now; Thu+Fri also closed; next open day is Saturday
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: hoursWithClosedDays });
    expect(status.nextOpen).toEqual({ label: "Saturday", time: "10:00 AM" });
  });

  it("has no nextOpen for a manual closure (no schedule to report)", () => {
    vi.setSystemTime(WEDNESDAY_14_00_DHAKA);
    const status = getRestaurantStatus({ isManuallyClosed: true, temporaryClosureUntil: null, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.nextOpen).toBeUndefined();
  });

  it("reports the resume date/time for a temporary closure", () => {
    vi.setSystemTime(WEDNESDAY_14_00_DHAKA);
    const resumeAt = new Date("2024-01-05T08:30:00Z"); // Fri 14:30 Dhaka
    const status = getRestaurantStatus({ isManuallyClosed: false, temporaryClosureUntil: resumeAt, scheduledOrderingEnabled: false, weeklyHours: regularHours });
    expect(status.nextOpen).toEqual({ label: "on Jan 5", time: "2:30 PM" });
  });
});
