"use client";

import { useActionState } from "react";
import { registerRiderAction } from "@/lib/actions/rider-application";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function RiderRegisterForm() {
  const [state, formAction] = useActionState(registerRiderAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required aria-invalid={!!state.fieldErrors?.name} />
        <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="phone">Mobile number</Label>
        <Input id="phone" name="phone" type="tel" placeholder="01712345678" required aria-invalid={!!state.fieldErrors?.phone} />
        <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!state.fieldErrors?.password} />
        <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required aria-invalid={!!state.fieldErrors?.confirmPassword} />
        <FieldError>{state.fieldErrors?.confirmPassword?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="vehicleType">Vehicle type</Label>
        <Select id="vehicleType" name="vehicleType" defaultValue="" required aria-invalid={!!state.fieldErrors?.vehicleType}>
          <option value="" disabled>
            Choose your vehicle
          </option>
          <option value="BICYCLE">Bicycle</option>
          <option value="MOTORBIKE">Motorbike</option>
          <option value="OTHER">Other</option>
        </Select>
        <FieldError>{state.fieldErrors?.vehicleType?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="nationalIdNo">National ID number</Label>
        <Input id="nationalIdNo" name="nationalIdNo" required aria-invalid={!!state.fieldErrors?.nationalIdNo} />
        <FieldError>{state.fieldErrors?.nationalIdNo?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="nationalIdDoc">National ID photo</Label>
        <input
          id="nationalIdDoc"
          name="nationalIdDoc"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          aria-invalid={!!state.fieldErrors?.nationalIdDoc}
          className="block w-full text-sm text-brand-dark file:mr-3 file:rounded-control file:border-0 file:bg-brand-primary file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-primary-hover"
        />
        <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP, or PDF — max 5MB.</p>
        <FieldError>{state.fieldErrors?.nationalIdDoc?.[0]}</FieldError>
      </div>
      <SubmitButton>Create rider account</SubmitButton>
    </form>
  );
}
