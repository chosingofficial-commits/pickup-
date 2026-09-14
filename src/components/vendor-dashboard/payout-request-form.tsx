"use client";

import { useActionState } from "react";
import { requestPayoutAction } from "@/lib/actions/vendor-payouts";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function PayoutRequestForm({ available }: { available: number }) {
  const [state, formAction] = useActionState(requestPayoutAction, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      <div>
        <Label htmlFor="amount">Amount to withdraw (available: ৳{available.toFixed(2)})</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" max={available} required />
        <FieldError>{state.fieldErrors?.amount?.[0]}</FieldError>
      </div>
      <SubmitButton className="w-auto px-6" disabled={available <= 0}>
        Request payout
      </SubmitButton>
    </form>
  );
}
