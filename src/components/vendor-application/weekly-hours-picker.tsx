"use client";

import { useState } from "react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DayHours = { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean };

/**
 * Structured hours picker — writes a 7-entry
 * { dayOfWeek, opensAt, closesAt, isClosed }[] into a hidden
 * `weeklyHoursJson` input, the exact shape both RestaurantWeeklyHours and
 * VendorWeeklyHours rows need (see lib/restaurant/weekly-hours-form-data.ts,
 * the one place that parses this back out). Used for the vendor-application
 * wizard (no `defaultHours` — starts blank) and for editing existing hours
 * in the vendor dashboard / admin vendor detail page (`defaultHours` passed
 * in, starting in the full per-day view so it never silently collapses real
 * data into "same every day" unless it genuinely already is that).
 */
export function WeeklyHoursPicker({ defaultHours }: { defaultHours?: DayHours[] }) {
  const initialPerDay =
    defaultHours ?? Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, opensAt: "10:00", closesAt: "22:00", isClosed: false }));
  // Detect whether the incoming hours already happen to be identical every
  // day, so re-opening an already-"same every day" schedule starts in that
  // view instead of always defaulting to the per-day editor.
  const openDays = initialPerDay.filter((d) => !d.isClosed);
  const alreadyUniform = openDays.length > 0 && openDays.every((d) => d.opensAt === openDays[0]!.opensAt && d.closesAt === openDays[0]!.closesAt);

  const [sameEveryDay, setSameEveryDay] = useState(defaultHours ? alreadyUniform : true);
  const [opensAt, setOpensAt] = useState(openDays[0]?.opensAt ?? "10:00");
  const [closesAt, setClosesAt] = useState(openDays[0]?.closesAt ?? "22:00");
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set(initialPerDay.filter((d) => d.isClosed).map((d) => d.dayOfWeek)));
  const [perDay, setPerDay] = useState<DayHours[]>(initialPerDay);

  const hours: DayHours[] = sameEveryDay
    ? Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, opensAt, closesAt, isClosed: closedDays.has(dayOfWeek) }))
    : perDay;

  function toggleClosedDay(day: number) {
    setClosedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function updatePerDay(day: number, patch: Partial<DayHours>) {
    setPerDay((prev) => prev.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="weeklyHoursJson" value={JSON.stringify(hours)} />

      <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
        <input type="checkbox" checked={sameEveryDay} onChange={(e) => setSameEveryDay(e.target.checked)} />
        Same hours every day
      </label>

      {sameEveryDay ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Opens</label>
              <input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="h-10 w-full rounded-control border border-border-brand px-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Closes</label>
              <input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="h-10 w-full rounded-control border border-border-brand px-2.5 text-sm" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-gray-500">Closed on (optional)</p>
            <div className="flex flex-wrap gap-2">
              {DAY_SHORT.map((label, day) => (
                <label
                  key={day}
                  className={`cursor-pointer rounded-control border px-3 py-1.5 text-xs font-medium ${
                    closedDays.has(day) ? "border-brand-primary bg-brand-bg text-brand-dark" : "border-border-brand text-gray-500"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={closedDays.has(day)} onChange={() => toggleClosedDay(day)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {DAY_NAMES.map((name, day) => {
            const d = perDay.find((p) => p.dayOfWeek === day)!;
            return (
              <div key={day} className="grid grid-cols-[88px_1fr_1fr_auto] items-center gap-2 text-sm">
                <span className="text-xs font-medium text-brand-dark">{name}</span>
                <input
                  type="time"
                  value={d.opensAt}
                  disabled={d.isClosed}
                  onChange={(e) => updatePerDay(day, { opensAt: e.target.value })}
                  className="h-9 rounded-control border border-border-brand px-2 text-xs disabled:opacity-50"
                />
                <input
                  type="time"
                  value={d.closesAt}
                  disabled={d.isClosed}
                  onChange={(e) => updatePerDay(day, { closesAt: e.target.value })}
                  className="h-9 rounded-control border border-border-brand px-2 text-xs disabled:opacity-50"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input type="checkbox" checked={d.isClosed} onChange={(e) => updatePerDay(day, { isClosed: e.target.checked })} />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
