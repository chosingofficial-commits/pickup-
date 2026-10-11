"use client";

import { useActionState } from "react";
import { WeeklyHoursPicker, type DayHours } from "@/components/vendor-application/weekly-hours-picker";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/submit-button";

export type WeeklyHourDefault = DayHours;

/** Admin equivalent of vendor-dashboard/weekly-hours-form.tsx — same shape, acting on behalf of a vendorId instead of the logged-in vendor. The action prop distinguishes restaurant vs. grocery-shop (two different Prisma models to write to). */
export function AdminWeeklyHoursForm({
  vendorId,
  defaults,
  action,
}: {
  vendorId: string;
  defaults: DayHours[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vendorId" value={vendorId} />
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {state.status === "error" && state.message && <p className="text-sm text-red-600">{state.message}</p>}
      <WeeklyHoursPicker defaultHours={defaults} />
      <SubmitButton className="w-auto px-6">Save hours</SubmitButton>
    </form>
  );
}
