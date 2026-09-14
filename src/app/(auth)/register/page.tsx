"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, initialActionState);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Create your account</h1>
      <p className="mt-1 text-sm text-gray-600">Shop groceries, essentials, and restaurant food in Khagrachari Sadar.</p>

      <form action={formAction} className="mt-6 space-y-4" noValidate>
        {state.status === "error" && state.message && (
          <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!state.fieldErrors?.name} />
          <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01712345678"
            required
            aria-invalid={!!state.fieldErrors?.phone}
          />
          <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!state.fieldErrors?.email} />
          <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={!!state.fieldErrors?.password}
          />
          <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={!!state.fieldErrors?.confirmPassword}
          />
          <FieldError>{state.fieldErrors?.confirmPassword?.[0]}</FieldError>
        </div>

        <SubmitButton>Create account</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
