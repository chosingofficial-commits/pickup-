const BD_OFFSET_MS = 6 * 60 * 60 * 1000; // Bangladesh is UTC+6, no DST.

/** Converts a "YYYY-MM-DD" date (interpreted as Bangladesh-local midnight) to its UTC instant. */
export function bdDateStringToUtcStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - BD_OFFSET_MS);
}

/** Converts a "YYYY-MM-DD" date to the UTC instant of 23:59:59.999 Bangladesh-local time. */
export function bdDateStringToUtcEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - BD_OFFSET_MS);
}

/** Whole-day count between two "YYYY-MM-DD" dates, for a daily-rate price estimate. */
export function bdDateRangeDays(startDateStr: string, endDateStr: string): number {
  const start = bdDateStringToUtcStart(startDateStr);
  const end = bdDateStringToUtcStart(endDateStr);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}
