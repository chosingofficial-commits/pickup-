"use client";

import { useActionState } from "react";
import { placeOrderAction } from "@/lib/actions/place-order";
import { initialActionState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/submit-button";

export function PlaceOrderButton() {
  const [state, formAction] = useActionState(placeOrderAction, initialActionState);

  return (
    <form action={formAction}>
      {state.status === "error" && (
        <p role="alert" className="mb-3 rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <SubmitButton size="lg">Place order</SubmitButton>
    </form>
  );
}
