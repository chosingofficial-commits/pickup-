export type WeeklyHour = { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean };

export type RestaurantOperatingInput = {
  isManuallyClosed: boolean;
  temporaryClosureUntil: Date | null;
  scheduledOrderingEnabled: boolean;
  weeklyHours: WeeklyHour[];
};

export type RestaurantStatus = {
  isOpenNow: boolean;
  canAcceptImmediateOrders: boolean;
  canAcceptScheduledOrders: boolean;
  reason?: "manually_closed" | "temporarily_closed" | "outside_hours";
  nextOpensAt?: string;
};

function nowInDhaka(): { dayOfWeek: number; time: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayOfWeek: dayMap[weekdayShort] ?? 0, time: `${hour === "24" ? "00" : hour}:${minute}` };
}

function isWithinWindow(time: string, opensAt: string, closesAt: string): boolean {
  if (opensAt <= closesAt) {
    return time >= opensAt && time <= closesAt;
  }
  // Overnight window, e.g. 22:00–02:00
  return time >= opensAt || time <= closesAt;
}

export function getRestaurantStatus(input: RestaurantOperatingInput): RestaurantStatus {
  if (input.isManuallyClosed) {
    return { isOpenNow: false, canAcceptImmediateOrders: false, canAcceptScheduledOrders: input.scheduledOrderingEnabled, reason: "manually_closed" };
  }
  if (input.temporaryClosureUntil && input.temporaryClosureUntil > new Date()) {
    return { isOpenNow: false, canAcceptImmediateOrders: false, canAcceptScheduledOrders: input.scheduledOrderingEnabled, reason: "temporarily_closed" };
  }

  const { dayOfWeek, time } = nowInDhaka();
  const today = input.weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);

  const isOpenNow = !!today && !today.isClosed && isWithinWindow(time, today.opensAt, today.closesAt);

  return {
    isOpenNow,
    canAcceptImmediateOrders: isOpenNow,
    canAcceptScheduledOrders: input.scheduledOrderingEnabled,
    reason: isOpenNow ? undefined : "outside_hours",
    nextOpensAt: today && !today.isClosed ? today.opensAt : undefined,
  };
}
