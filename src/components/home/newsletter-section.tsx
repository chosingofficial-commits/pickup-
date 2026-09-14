"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { subscribeNewsletterAction } from "@/lib/actions/newsletter";
import { initialActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function NewsletterSection({ title, body, cta }: { title: string; body: string; cta: string }) {
  const [state, formAction] = useActionState(subscribeNewsletterAction, initialActionState);

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border-brand bg-brand-bg p-6 text-center sm:p-8">
      <Mail className="h-8 w-8 text-brand-primary" aria-hidden />
      <h2 className="font-heading text-xl font-bold text-brand-dark">{title}</h2>
      <p className="max-w-md text-sm text-gray-600">{body}</p>

      {state.status === "success" ? (
        <p role="status" className="text-sm font-medium text-brand-dark">
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="mt-1 flex w-full max-w-sm flex-col gap-2 sm:flex-row" noValidate>
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input id="newsletter-email" name="email" type="email" placeholder="you@example.com" required className="bg-white" />
          <SubmitButton className="sm:w-auto sm:px-6">{cta}</SubmitButton>
        </form>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
