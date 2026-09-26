"use client";

import { useActionState, useRef } from "react";
import { createMenuItemAction } from "@/lib/actions/vendor-menu";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";

export function AddMenuItemForm({ menuId }: { menuId: string }) {
  const [state, formAction] = useActionState(createMenuItemAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 rounded-control bg-surface-muted p-3 sm:grid-cols-2">
      <input type="hidden" name="menuId" value={menuId} />
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
