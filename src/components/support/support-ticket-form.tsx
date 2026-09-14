"use client";

import { useActionState } from "react";
import { submitSupportTicketAction } from "@/lib/actions/support";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

const CATEGORIES = ["Order issue", "Payment issue", "Delivery issue", "Account", "Vendor / restaurant", "Other"];

export function SupportTicketForm({ defaultName, defaultEmail, defaultPhone }: { defaultName?: string; defaultEmail?: string; defaultPhone?: string }) {
  const [state, formAction] = useActionState(submitSupportTicketAction, initialActionState);

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-control bg-brand-bg px-4 py-3 text-sm text-brand-dark">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="st-name">Name</Label>
          <Input id="st-name" name="name" defaultValue={defaultName} required aria-invalid={!!state.fieldErrors?.name} />
          <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="st-email">Email</Label>
          <Input id="st-email" name="email" type="email" defaultValue={defaultEmail} required aria-invalid={!!state.fieldErrors?.email} />
          <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
        </div>
      </div>
      <div>
        <Label htmlFor="st-phone">Phone (optional)</Label>
        <Input id="st-phone" name="phone" type="tel" defaultValue={defaultPhone} />
      </div>
      <div>
        <Label htmlFor="st-category">Category</Label>
        <Select id="st-category" name="category" defaultValue={CATEGORIES[0]}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="st-subject">Subject</Label>
        <Input id="st-subject" name="subject" required aria-invalid={!!state.fieldErrors?.subject} />
        <FieldError>{state.fieldErrors?.subject?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="st-message">How can we help?</Label>
        <Textarea id="st-message" name="message" rows={4} required aria-invalid={!!state.fieldErrors?.message} />
        <FieldError>{state.fieldErrors?.message?.[0]}</FieldError>
      </div>
      <SubmitButton className="w-auto px-6">Submit request</SubmitButton>
    </form>
  );
}
