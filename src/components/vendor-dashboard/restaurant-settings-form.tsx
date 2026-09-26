"use client";

import { useActionState } from "react";
import { updateRestaurantSettingsAction } from "@/lib/actions/vendor-hours";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function RestaurantSettingsForm({
  defaults,
}: {
  defaults: { preparationTimeMinutes: number; isManuallyClosed: boolean; scheduledOrderingEnabled: boolean; minimumOrderAmount: number };
}) {
  const [state, formAction] = useActionState(updateRestaurantSettingsAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="preparationTimeMinutes">Preparation time (minutes)</Label>
          <Input id="preparationTimeMinutes" name="preparationTimeMinutes" type="number" min={5} defaultValue={defaults.preparationTimeMinutes} />
        </div>
        <div>
          <Label htmlFor="minimumOrderAmount">Minimum order amount (Tk)</Label>
          <Input id="minimumOrderAmount" name="minimumOrderAmount" type="number" min={0} defaultValue={defaults.minimumOrderAmount} />
        </div>
      </div>
      <div>
        <Label htmlFor="temporaryClosureUntil">Temporarily close until (optional)</Label>
        <Input id="temporaryClosureUntil" name="temporaryClosureUntil" type="datetime-local" />
        <p className="mt-1 text-xs text-gray-500">Leave blank to remove any temporary closure.</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="isManuallyClosed" value="1" defaultChecked={defaults.isManuallyClosed} />
        Close immediately (overrides your opening hours until you turn this off)
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="scheduledOrderingEnabled" value="1" defaultChecked={defaults.scheduledOrderingEnabled} />
        Accept scheduled orders while closed
      </label>
      <SubmitButton className="w-auto px-6">Save settings</SubmitButton>
    </form>
  );
}
