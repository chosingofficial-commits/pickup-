"use client";

import { useActionState } from "react";
import { createCategoryAction } from "@/lib/actions/admin-categories";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function CategoryForm({ topLevelCategories }: { topLevelCategories: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(createCategoryAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="cat-name">Category name</Label>
        <Input id="cat-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="cat-parent">Parent (optional)</Label>
        <Select id="cat-parent" name="parentId" defaultValue="">
          <option value="">None (top-level)</option>
          {topLevelCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex items-center gap-2 pb-2.5 text-sm text-gray-700">
        <input type="checkbox" name="isAgeRestricted" value="1" />
        Age-restricted (starts disabled)
      </label>
      <SubmitButton className="w-auto px-5">Add category</SubmitButton>
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
