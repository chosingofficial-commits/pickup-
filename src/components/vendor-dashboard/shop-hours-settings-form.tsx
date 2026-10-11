"use client";

import { useActionState } from "react";
import { updateShopHoursSettingsAction } from "@/lib/actions/vendor-hours";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

/** Grocery-shop equivalent of RestaurantSettingsForm, minus the restaurant-only preparation-time/minimum-order fields — same isManuallyClosed/temporaryClosureUntil/scheduledOrderingEnabled trio, same copy. */
export function ShopHoursSettingsForm({
  defaults,
}: {
  defaults: { isManuallyClosed: boolean; scheduledOrderingEnabled: boolean };
}) {
  const [state, formAction] = useActionState(updateShopHoursSettingsAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor="temporaryClosureUntil">Temporarily close until (optional)</Label>
        <Input id="temporaryClosureUntil" name="temporaryClosureUntil" type="datetime-local" />
        <p className="mt-1 text-xs text-gray-500">Leave blank to remove any temporary closure.</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="isManuallyClosed" value="1" defaultChecked={defaults.isManuallyClosed} />
        Pause orders now (overrides your opening hours until you turn this off)
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="scheduledOrderingEnabled" value="1" defaultChecked={defaults.scheduledOrderingEnabled} />
        Accept scheduled orders while closed
      </label>
      <SubmitButton className="w-auto px-6">Save settings</SubmitButton>
    </form>
  );
}
