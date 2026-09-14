"use client";

import { useActionState } from "react";
import { updateVendorProfileAction } from "@/lib/actions/vendor-profile";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";

export function BusinessProfileForm({
  defaults,
}: {
  defaults: { businessName: string; description: string; phone: string; email: string; addressText: string };
}) {
  const [state, formAction] = useActionState(updateVendorProfileAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "success" && (
        <p role="status" className="rounded-control bg-brand-bg px-3.5 py-2.5 text-sm text-brand-dark">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" defaultValue={defaults.businessName} required aria-invalid={!!state.fieldErrors?.businessName} />
        <FieldError>{state.fieldErrors?.businessName?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} required aria-invalid={!!state.fieldErrors?.phone} />
          <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults.email} required aria-invalid={!!state.fieldErrors?.email} />
          <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
        </div>
      </div>
      <div>
        <Label htmlFor="addressText">Address</Label>
        <Textarea id="addressText" name="addressText" rows={2} defaultValue={defaults.addressText} required aria-invalid={!!state.fieldErrors?.addressText} />
        <FieldError>{state.fieldErrors?.addressText?.[0]}</FieldError>
      </div>
      <FileUploadField name="logoUrl" label="Logo" folder="vendor-logos" />
      <FileUploadField name="coverImageUrl" label="Cover image" folder="vendor-covers" />
      <SubmitButton className="w-auto px-6">Save changes</SubmitButton>
    </form>
  );
}
