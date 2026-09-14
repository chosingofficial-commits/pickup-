"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/profile";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialActionState);

  return (
    <form action={formAction} className="max-w-md space-y-4" noValidate>
      {state.status === "success" && (
        <p role="status" className="rounded-control bg-brand-bg px-3.5 py-2.5 text-sm text-brand-dark">
          {state.message}
        </p>
      )}
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        <FieldError>{state.fieldErrors?.currentPassword?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
        <FieldError>{state.fieldErrors?.newPassword?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        <FieldError>{state.fieldErrors?.confirmPassword?.[0]}</FieldError>
      </div>
      <SubmitButton className="w-auto px-6">Update password</SubmitButton>
    </form>
  );
}
