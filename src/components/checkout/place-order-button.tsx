"use client";

import { useActionState, useState } from "react";
import { placeOrderAction } from "@/lib/actions/place-order";
import { initialActionState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/submit-button";

export function PlaceOrderButton({
  requiresAgeConfirmation = false,
  minimumAge,
  healthWarningText,
}: {
  /** True when the cart contains an age-restricted item (cigarettes & smoking accessories) — placeOrderAction independently re-checks this itself, never trusting this prop alone. */
  requiresAgeConfirmation?: boolean;
  minimumAge?: number;
  healthWarningText?: string;
}) {
  const [state, formAction] = useActionState(placeOrderAction, initialActionState);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  return (
    <form action={formAction}>
      {state.status === "error" && (
        <p role="alert" className="mb-3 rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {requiresAgeConfirmation && (
        <div className="mb-3 rounded-control border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          <p className="font-medium">{healthWarningText}</p>
          <label className="mt-2 flex items-start gap-2 text-sm text-red-800">
            <input
              type="checkbox"
              name="ageConfirmed"
              value="1"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5"
              required
            />
            I confirm that I am at least {minimumAge} years old. I may be asked to verify my age with a valid ID at
            the time of delivery.
          </label>
        </div>
      )}
      <SubmitButton size="lg" disabled={requiresAgeConfirmation && !ageConfirmed}>
        Place order
      </SubmitButton>
    </form>
  );
}
