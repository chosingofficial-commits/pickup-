"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMenuItemAction } from "@/lib/actions/vendor-menu";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";

export function AddMenuItemForm({ menuId }: { menuId: string }) {
  const [state, formAction] = useActionState(createMenuItemAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  // Saving can fail for reasons with no field to anchor the error to (e.g. the
  // menu itself was deleted in another tab) — always surface state.message,
  // not just the three fields with their own FieldError below, so a failed
  // save is never silent. On success, clear the form so it's ready for the
  // next item (the new one appears in the list above via revalidatePath).
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 rounded-control bg-surface-muted p-3 sm:grid-cols-2">
      <input type="hidden" name="menuId" value={menuId} />
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700 sm:col-span-2">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="rounded-control bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 sm:col-span-2">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor={`item-name-${menuId}`}>Item name</Label>
        <Input id={`item-name-${menuId}`} name="name" required aria-invalid={!!state.fieldErrors?.name} />
        <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor={`item-price-${menuId}`}>Price (Tk)</Label>
        <Input id={`item-price-${menuId}`} name="price" type="number" step="0.01" min="0" required aria-invalid={!!state.fieldErrors?.price} />
        <FieldError>{state.fieldErrors?.price?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor={`item-compare-${menuId}`}>Old price (optional)</Label>
        <Input id={`item-compare-${menuId}`} name="compareAtPrice" type="number" step="0.01" min="0" placeholder="Shown crossed out" aria-invalid={!!state.fieldErrors?.compareAtPrice} />
        <FieldError>{state.fieldErrors?.compareAtPrice?.[0]}</FieldError>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`item-desc-${menuId}`}>Description</Label>
        <Input id={`item-desc-${menuId}`} name="description" />
      </div>
      <div className="sm:col-span-2">
        <FileUploadField name="imageUrl" label="Photo (optional)" folder="menu-items" />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton className="w-auto px-5">Add item</SubmitButton>
      </div>
    </form>
  );
}
