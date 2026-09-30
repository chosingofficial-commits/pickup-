"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);
  const signupHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Log in to Pick Up</h1>
      <p className="mt-1 text-sm text-gray-600">Order groceries, essentials, and food across Khagrachari Sadar.</p>

      <form action={formAction} className="mt-6 space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.status === "error" && state.message && (
          <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.message}
          </p>
        )}

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
            aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined}
          />
          <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!state.fieldErrors?.password}
          />
          <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
        </div>

        <SubmitButton>Log in</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        New to Pick Up?{" "}
        <Link href={signupHref} className="font-semibold text-brand-primary hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-600">
        <Link href="/vendor/register" className="text-brand-dark hover:underline">
          Register a shop or restaurant
        </Link>
      </p>
    </div>
  );
}
