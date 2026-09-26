"use client";

import { useActionState } from "react";
import { createProductAction, updateProductAction } from "@/lib/actions/vendor-products";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";

export type ProductFormDefaults = {
  id?: string;
  name?: string;
  categoryId?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number | null;
  unit?: string;
  sku?: string;
  quantityInStock?: number;
  images?: string[];
  isWeeklyGrocery?: boolean;
};

const MAX_PRODUCT_PHOTOS = 4;

export function ProductForm({
  categories,
  defaults,
}: {
  categories: { id: string; name: string }[];
  defaults?: ProductFormDefaults;
}) {
  const isEdit = !!defaults?.id;
  const [state, formAction] = useActionState(isEdit ? updateProductAction : createProductAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {isEdit && <input type="hidden" name="productId" value={defaults!.id} />}
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <Label htmlFor="name">Product name</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} required aria-invalid={!!state.fieldErrors?.name} />
        <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select id="categoryId" name="categoryId" defaultValue={defaults?.categoryId ?? ""} required aria-invalid={!!state.fieldErrors?.categoryId}>
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <FieldError>{state.fieldErrors?.categoryId?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults?.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="price">Price (Tk)</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={defaults?.price} required aria-invalid={!!state.fieldErrors?.price} />
          <FieldError>{state.fieldErrors?.price?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="compareAtPrice">Compare-at price (optional)</Label>
          <Input id="compareAtPrice" name="compareAtPrice" type="number" step="0.01" min="0" defaultValue={defaults?.compareAtPrice ?? ""} />
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" placeholder="1 kg, 500 ml, piece…" defaultValue={defaults?.unit} required aria-invalid={!!state.fieldErrors?.unit} />
          <FieldError>{state.fieldErrors?.unit?.[0]}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sku">SKU (optional)</Label>
          <Input id="sku" name="sku" defaultValue={defaults?.sku} />
        </div>
        <div>
          <Label htmlFor="quantityInStock">Stock quantity</Label>
          <Input id="quantityInStock" name="quantityInStock" type="number" min="0" defaultValue={defaults?.quantityInStock ?? 0} required aria-invalid={!!state.fieldErrors?.quantityInStock} />
          <FieldError>{state.fieldErrors?.quantityInStock?.[0]}</FieldError>
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-control border border-border-brand p-3 text-sm text-gray-700">
        <input type="checkbox" name="isWeeklyGrocery" value="1" defaultChecked={defaults?.isWeeklyGrocery} className="mt-0.5" />
        <span>
          <span className="block font-medium text-brand-dark">Weekly grocery pick</span>
          <span className="block text-xs text-gray-500">
            Featured in the homepage &quot;This week&apos;s grocery picks&quot; section. Orders containing this item must be
            scheduled at least 24 hours ahead instead of fast/ASAP delivery.
          </span>
        </span>
      </label>

      <div>
        <Label>Product photos (up to {MAX_PRODUCT_PHOTOS})</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: MAX_PRODUCT_PHOTOS }, (_, i) => (
            <FileUploadField
              key={i}
              fieldId={`imageUrls-${i}`}
              name="imageUrls"
              label={i === 0 ? "Photo 1 (primary)" : `Photo ${i + 1}`}
              folder="products"
              defaultUrl={defaults?.images?.[i]}
            />
          ))}
        </div>
      </div>

      <SubmitButton className="w-auto px-6">{isEdit ? "Save changes" : "Add product"}</SubmitButton>
    </form>
  );
}
