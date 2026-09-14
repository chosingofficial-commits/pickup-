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
