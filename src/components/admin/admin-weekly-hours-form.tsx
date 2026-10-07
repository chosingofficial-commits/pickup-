"use client";

import { useActionState } from "react";
import { adminUpdateWeeklyHoursAction } from "@/lib/actions/admin-vendors";
import { initialActionState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/submit-button";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type WeeklyHourDefault = { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean };

/** Admin equivalent of vendor-dashboard/weekly-hours-form.tsx — same shape, acting on behalf of a vendorId instead of the logged-in vendor. */
export function AdminWeeklyHoursForm({ vendorId, defaults }: { vendorId: string; defaults: WeeklyHourDefault[] }) {
  const [state, formAction] = useActionState(adminUpdateWeeklyHoursAction, initialActionState);
  const byDay = new Map(defaults.map((d) => [d.dayOfWeek, d]));

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="vendorId" value={vendorId} />
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {DAY_NAMES.map((name, day) => {
        const d = byDay.get(day);
        return (
          <div key={day} className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-2 text-sm">
            <span className="font-medium text-brand-dark">{name}</span>
            <input
              type="time"
              name={`opens-${day}`}
              defaultValue={d?.opensAt ?? "10:00"}
              className="h-9 rounded-control border border-border-brand px-2 text-sm"
            />
            <input
              type="time"
              name={`closes-${day}`}
              defaultValue={d?.closesAt ?? "22:00"}
              className="h-9 rounded-control border border-border-brand px-2 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" name={`closed-${day}`} value="1" defaultChecked={d?.isClosed} />
              Closed
            </label>
          </div>
        );
      })}
      <SubmitButton className="w-auto px-6">Save hours</SubmitButton>
    </form>
  );
}
