"use client";

import { useActionState } from "react";
import { createMenuAction } from "@/lib/actions/vendor-menu";
import { initialActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function AddMenuForm() {
  const [state, formAction] = useActionState(createMenuAction, initialActionState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="new-menu-name" className="mb-1.5 block text-sm font-medium text-brand-dark">
          New menu name
        </label>
        <Input id="new-menu-name" name="name" placeholder="E.g. Lunch Specials" required />
      </div>
      <SubmitButton className="w-auto px-5">Add menu</SubmitButton>
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
