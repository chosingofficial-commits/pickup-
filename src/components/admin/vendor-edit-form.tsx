"use client";

import { useActionState } from "react";
import { updateVendorShopDetailsAction } from "@/lib/actions/admin-vendors";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";

export function VendorEditForm({
  defaults,
}: {
  defaults: {
    vendorId: string;
    businessName: string;
    description: string;
    phone: string;
    addressText: string;
    commissionRatePct: number;
    logoUrl: string | null;
    coverImageUrl: string | null;
  };
}) {
  const [state, formAction] = useActionState(updateVendorShopDetailsAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="vendorId" value={defaults.vendorId} />
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
          <Label htmlFor="commissionRatePct">Commission rate (%)</Label>
          <Input
            id="commissionRatePct"
            name="commissionRatePct"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={defaults.commissionRatePct}
            required
            aria-invalid={!!state.fieldErrors?.commissionRatePct}
          />
          <FieldError>{state.fieldErrors?.commissionRatePct?.[0]}</FieldError>
        </div>
      </div>
      <div>
        <Label htmlFor="addressText">Address</Label>
        <Textarea id="addressText" name="addressText" rows={2} defaultValue={defaults.addressText} required aria-invalid={!!state.fieldErrors?.addressText} />
        <FieldError>{state.fieldErrors?.addressText?.[0]}</FieldError>
      </div>
      <FileUploadField name="logoUrl" label="Logo" folder="vendor-logos" defaultUrl={defaults.logoUrl} />
      <FileUploadField name="coverImageUrl" label="Cover image" folder="vendor-covers" defaultUrl={defaults.coverImageUrl} />
      <SubmitButton className="w-auto px-6">Save changes</SubmitButton>
    </form>
  );
}
