"use client";

import { useActionState, useEffect } from "react";
import { submitCoverageRequestAction } from "@/lib/actions/location";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function CoverageRequestForm({
  defaultAddress,
  lat,
  lng,
  onSuccess,
}: {
  defaultAddress?: string;
  lat?: number;
  lng?: number;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(submitCoverageRequestAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-control bg-brand-bg px-4 py-3 text-sm text-brand-dark">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {lat != null && lng != null && <input type="hidden" name="lat" value={lat} />}
      {lat != null && lng != null && <input type="hidden" name="lng" value={lng} />}

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <Label htmlFor="cr-name">Your name</Label>
        <Input id="cr-name" name="name" required aria-invalid={!!state.fieldErrors?.name} />
        <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="cr-phone">Mobile number</Label>
        <Input id="cr-phone" name="phone" type="tel" placeholder="01712345678" required aria-invalid={!!state.fieldErrors?.phone} />
        <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="cr-address">Your area / address</Label>
        <Textarea
          id="cr-address"
          name="addressText"
          rows={2}
          required
          defaultValue={defaultAddress}
          aria-invalid={!!state.fieldErrors?.addressText}
        />
        <FieldError>{state.fieldErrors?.addressText?.[0]}</FieldError>
      </div>
      <SubmitButton>Join the waiting list</SubmitButton>
    </form>
  );
}
