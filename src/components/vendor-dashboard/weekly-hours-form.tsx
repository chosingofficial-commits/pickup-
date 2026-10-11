"use client";

import { useActionState } from "react";
import { WeeklyHoursPicker, type DayHours } from "@/components/vendor-application/weekly-hours-picker";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/submit-button";

export type WeeklyHourDefault = DayHours;

/** Shared by restaurant and grocery-shop hours editing (vendor self-serve and admin-on-behalf) — the action to post to is the only thing that differs between those four call sites. Wraps the same WeeklyHoursPicker the vendor-application wizard uses. */
export function WeeklyHoursForm({
  defaults,
  action,
}: {
  defaults: WeeklyHourDefault[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {state.status === "error" && state.message && <p className="text-sm text-red-600">{state.message}</p>}
      <WeeklyHoursPicker defaultHours={defaults} />
      <SubmitButton className="w-auto px-6">Save hours</SubmitButton>
    </form>
  );
}
