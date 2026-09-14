"use client";

import { useActionState } from "react";
import { updateTobaccoSettingsAction } from "@/lib/actions/admin-tobacco";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function TobaccoSettingsForm({
  defaults,
  envEnabled,
}: {
  defaults: { tobaccoSalesEnabled: boolean; minimumAge: number; exclusionRadiusMeters: number; healthWarningText: string };
  envEnabled: boolean;
}) {
  const [state, formAction] = useActionState(updateTobaccoSettingsAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}

      <label className="flex items-start gap-2 rounded-control border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <input type="checkbox" name="tobaccoSalesEnabled" value="1" defaultChecked={defaults.tobaccoSalesEnabled} disabled={!envEnabled} className="mt-0.5" />
        <span>
          Enable tobacco sales module
          {!envEnabled && (
            <span className="mt-1 block text-xs">
              Locked off — the <code>TOBACCO_SALES_ENABLED</code> environment variable must be set to true by a developer
              after legal/compliance review before this can be turned on here.
            </span>
          )}
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="minimumAge">Minimum age</Label>
          <Input id="minimumAge" name="minimumAge" type="number" min={18} defaultValue={defaults.minimumAge} />
        </div>
        <div>
          <Label htmlFor="exclusionRadiusMeters">Exclusion zone radius (meters)</Label>
          <Input id="exclusionRadiusMeters" name="exclusionRadiusMeters" type="number" min={10} defaultValue={defaults.exclusionRadiusMeters} />
        </div>
      </div>
      <div>
        <Label htmlFor="healthWarningText">Health warning text (shown on product pages when enabled)</Label>
        <Textarea id="healthWarningText" name="healthWarningText" rows={2} defaultValue={defaults.healthWarningText} />
      </div>

      <SubmitButton className="w-auto px-6">Save settings</SubmitButton>
    </form>
  );
}
