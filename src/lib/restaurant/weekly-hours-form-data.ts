import { z } from "zod";
import { dayHoursSchema } from "@/lib/validation/vendor-application";
import type { WeeklyHour } from "./status";

/**
 * Shared by every weekly-hours action (restaurant self-serve, grocery
 * self-serve, and both admin-on-behalf-of variants) — parses the
 * `weeklyHoursJson` hidden input WeeklyHoursForm/WeeklyHoursPicker posts,
 * reusing the exact same validated shape the vendor-application wizard's
 * submission already parses into (see lib/validation/vendor-application.ts),
 * so this JSON format and its validation rules exist in exactly one place.
 */
export function parseWeeklyHoursFormData(formData: FormData): WeeklyHour[] | null {
  const raw = formData.get("weeklyHoursJson");
  if (typeof raw !== "string" || raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = z.array(dayHoursSchema).length(7).safeParse(parsed);
  return result.success ? result.data : null;
}
