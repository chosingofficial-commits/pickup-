"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [state, formAction] = useActionState(updateProfileAction, initialActionState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      {state.status === "success" && (
        <p role="status" className="rounded-control bg-brand-bg px-3.5 py-2.5 text-sm text-brand-dark">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor="phone-ro">Mobile number</Label>
        <Input id="phone-ro" value={phone} disabled />
        <p className="mt-1 text-xs text-gray-500">Contact support to change your mobile number.</p>
      </div>
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={name} required aria-invalid={!!state.fieldErrors?.name} />
        <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={email} aria-invalid={!!state.fieldErrors?.email} />
        <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
      </div>
      <SubmitButton className="w-auto px-6">Save changes</SubmitButton>
    </form>
  );
}
