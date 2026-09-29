/**
 * Rotates `items` so every one gets an equal share of the first slot over
 * time, instead of whichever campaign was created earliest permanently
 * sitting first. Stable within an hour (same `now` -> same order), so a
 * visitor browsing for a few minutes doesn't see the order change under
 * them — it only advances hour to hour. Bangladesh has no DST and a
 * whole-hour UTC offset, so plain epoch-hours already lines up with
 * Bangladesh-local hour boundaries; no timezone conversion needed.
 */
export function rotateByHour<T>(items: T[], now: Date = new Date()): T[] {
  if (items.length <= 1) return items;
  const hoursSinceEpoch = Math.floor(now.getTime() / (60 * 60 * 1000));
  const startIndex = hoursSinceEpoch % items.length;
  return [...items.slice(startIndex), ...items.slice(0, startIndex)];
}

export type DateRange = { start: Date | string; end: Date | string };

function toTime(d: Date | string): number {
  return (d instanceof Date ? d : new Date(d)).getTime();
}

/** How many of `ranges` overlap [start, end] — used both for the admin capacity gate and the /advertise pre-submission warning. */
export function countOverlapping(ranges: DateRange[], start: Date | string, end: Date | string): number {
  const s = toTime(start);
  const e = toTime(end);
  return ranges.filter((r) => toTime(r.start) <= e && toTime(r.end) >= s).length;
}

/** "5 Oct" style, Bangladesh-local calendar date. */
export function formatShortBdDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" });
}
