export type WeeklyHour = { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean };

export type RestaurantOperatingInput = {
  isManuallyClosed: boolean;
  temporaryClosureUntil: Date | null;
  scheduledOrderingEnabled: boolean;
  weeklyHours: WeeklyHour[];
};

/** A fully-formed "reopens" phrase: render as `Opens ${label} at ${time}`. */
export type NextOpen = { label: string; time: string };

export type RestaurantStatus = {
  isOpenNow: boolean;
  canAcceptImmediateOrders: boolean;
  canAcceptScheduledOrders: boolean;
  reason?: "manually_closed" | "temporarily_closed" | "outside_hours";
  nextOpen?: NextOpen;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

/** "14:30" -> "2:30 PM" (stored hours are plain "HH:MM" strings, not Dates). */
export function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

/**
 * Finds the next instant this restaurant opens, given it's closed right now
 * for a weekly-hours reason (not manually/temporarily closed — those have
 * their own handling below). Two cases: it's still before today's opening
 * time (today isn't a closed day) — opens later today; otherwise scan
 * forward from tomorrow through the next 6 days for the first one that
 * isn't marked closed. Returns undefined only if every day of the week is
 * closed (nothing to report).
 */
function findNextWeeklyOpen(weeklyHours: WeeklyHour[], todayDayOfWeek: number, currentTime: string): NextOpen | undefined {
  const byDay = new Map(weeklyHours.map((h) => [h.dayOfWeek, h]));
  const today = byDay.get(todayDayOfWeek);

  if (today && !today.isClosed && currentTime < today.opensAt) {
    return { label: "today", time: formatTime12h(today.opensAt) };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const day = (todayDayOfWeek + offset) % 7;
    const hours = byDay.get(day);
    if (hours && !hours.isClosed) {
      return { label: offset === 1 ? "tomorrow" : DAY_NAMES[day]!, time: formatTime12h(hours.opensAt) };
    }
  }
  return undefined;
}

function formatTemporaryResume(resumeAt: Date): NextOpen {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "short", day: "numeric" }).format(resumeAt);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true }).format(resumeAt);
  return { label: `on ${label}`, time };
}

export function getRestaurantStatus(input: RestaurantOperatingInput): RestaurantStatus {
  if (input.isManuallyClosed) {
    // A vendor-flipped "closed now" switch has no schedule to reference —
    // there's genuinely nothing to tell the customer about when it reopens.
    return { isOpenNow: false, canAcceptImmediateOrders: false, canAcceptScheduledOrders: input.scheduledOrderingEnabled, reason: "manually_closed" };
  }
  if (input.temporaryClosureUntil && input.temporaryClosureUntil > new Date()) {
    return {
      isOpenNow: false,
      canAcceptImmediateOrders: false,
      canAcceptScheduledOrders: input.scheduledOrderingEnabled,
      reason: "temporarily_closed",
      nextOpen: formatTemporaryResume(input.temporaryClosureUntil),
    };
  }

  const { dayOfWeek, time } = nowInDhaka();
  const today = input.weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);

  const isOpenNow = !!today && !today.isClosed && isWithinWindow(time, today.opensAt, today.closesAt);

  return {
    isOpenNow,
    canAcceptImmediateOrders: isOpenNow,
    canAcceptScheduledOrders: input.scheduledOrderingEnabled,
    reason: isOpenNow ? undefined : "outside_hours",
    nextOpen: isOpenNow ? undefined : findNextWeeklyOpen(input.weeklyHours, dayOfWeek, time),
  };
}
