"use client";

import { useState, useActionState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { createProductAction, updateProductAction } from "@/lib/actions/vendor-products";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { MAX_PRODUCT_PHOTOS } from "@/lib/validation/product";
import { VARIANT_UNITS, VARIANT_UNIT_FORM_LABEL, QUICK_PACK_COUNTS, formatVariantLabel } from "@/lib/catalog/variant-label";

export type VariantRowDefaults = {
  id?: string;
  quantityValue: string;
  unit: string;
  packCount: number;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isDefault?: boolean;
};

export type ProductFormDefaults = {
  id?: string;
  name?: string;
  categoryId?: string;
  description?: string;
  sku?: string;
  images?: string[];
  isWeeklyGrocery?: boolean;
  variants?: VariantRowDefaults[];
};

type Row = {
  key: string;
  id?: string;
  quantityValue: string;
  unit: string;
  packCount: number;
  price: string;
  compareAtPrice: string;
  stock: string;
};

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function blankRow(quantityValue = "", unit = "PCS", packCount = 1): Row {
  return { key: nextKey(), quantityValue, unit, packCount, price: "", compareAtPrice: "", stock: "" };
}

function rowsFromDefaults(variants: VariantRowDefaults[] | undefined): { rows: Row[]; defaultIndex: number } {
  if (!variants || variants.length === 0) return { rows: [blankRow()], defaultIndex: 0 };
  const rows = variants.map((v) => ({
    key: nextKey(),
    id: v.id,
    quantityValue: v.quantityValue,
    unit: v.unit,
    packCount: v.packCount,
    price: String(v.price),
    compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
    stock: String(v.stock),
  }));
  const defaultIndex = Math.max(0, variants.findIndex((v) => v.isDefault));
  return { rows, defaultIndex };
}

export function ProductForm({
  categories,
  defaults,
}: {
  categories: { id: string; name: string; isAgeRestricted: boolean }[];
  defaults?: ProductFormDefaults;
}) {
  const isEdit = !!defaults?.id;
  const [state, formAction] = useActionState(isEdit ? updateProductAction : createProductAction, initialActionState);

  const [categoryId, setCategoryId] = useState(defaults?.categoryId ?? "");
  // Age-restricted products (cigarettes & smoking accessories) always show
  // the one standard plain pack image, never a vendor photo — see
  // plain-pack-image.tsx and TobaccoProductCard. Hiding the upload fields
  // here is the vendor-facing half of that; createProductAction/
  // updateProductAction ignore any imageUrls submitted anyway, so this
  // can't be bypassed by a tampered POST either.
  const isAgeRestrictedCategory = categories.find((c) => c.id === categoryId)?.isAgeRestricted ?? false;

  // An existing product from before the photo-limit cut may have more than
  // MAX_PRODUCT_PHOTOS saved — show every one of them (not just the first
  // MAX) so the vendor can actually remove the extras, rather than the form
  // silently hiding (and, on save, deleting) whatever didn't fit a slot.
  const existingPhotoCount = defaults?.images?.length ?? 0;
  const photoSlotCount = Math.max(MAX_PRODUCT_PHOTOS, existingPhotoCount);

  const initial = rowsFromDefaults(defaults?.variants);
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [defaultIndex, setDefaultIndex] = useState(initial.defaultIndex);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addBlankRow() {
    setRows((prev) => [...prev, blankRow(prev[0]?.quantityValue, prev[0]?.unit)]);
  }

  function addPackRow(packCount: number) {
    setRows((prev) => [...prev, blankRow(prev[0]?.quantityValue ?? "", prev[0]?.unit ?? "PCS", packCount)]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDefaultIndex((d) => (d === index ? 0 : d > index ? d - 1 : d));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDefaultIndex((d) => (d === index ? target : d === target ? index : d));
  }

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
        <Select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          aria-invalid={!!state.fieldErrors?.categoryId}
        >
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

      <div>
        <Label htmlFor="sku">SKU (optional)</Label>
        <Input id="sku" name="sku" defaultValue={defaults?.sku} />
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

      {isAgeRestrictedCategory ? (
        <div className="rounded-control border border-border-brand bg-surface-muted p-3.5 text-sm text-gray-700">
          <p className="font-medium text-brand-dark">No photos for this category</p>
          <p className="mt-1 text-xs text-gray-500">
            Cigarettes & smoking accessories always show the same standard plain pack image, name, and price to
            customers — vendors can&apos;t upload a product photo for this category.
          </p>
        </div>
      ) : (
        <div>
          <Label>Product photos (up to {MAX_PRODUCT_PHOTOS})</Label>
          {existingPhotoCount > MAX_PRODUCT_PHOTOS && (
            <p className="mb-2 rounded-control bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              This product has {existingPhotoCount} photos from before the {MAX_PRODUCT_PHOTOS}-photo limit — remove{" "}
              {existingPhotoCount - MAX_PRODUCT_PHOTOS} of them (✕ on a photo below) before you can save.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: photoSlotCount }, (_, i) => (
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
      )}

      <div>
        <Label>Sizes / options</Label>
        <p className="mb-2 text-xs text-gray-500">
          Add every size or pack you sell this as — customers pick one on the product page. Each has its own price, old
          price, and stock.
        </p>

        <input type="hidden" name="variantDefaultIndex" value={defaultIndex} />

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-control border border-border-brand p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-20">
                  <Label htmlFor={`variantPackCount-${row.key}`} className="text-xs">
                    Pack
                  </Label>
                  <Input
                    id={`variantPackCount-${row.key}`}
                    name="variantPackCount"
                    type="number"
                    min={1}
                    step={1}
                    value={row.packCount}
                    onChange={(e) => updateRow(index, { packCount: Math.max(1, Number(e.target.value) || 1) })}
                    className="h-9"
                  />
                </div>
                <div className="w-24">
                  <Label htmlFor={`variantQuantityValue-${row.key}`} className="text-xs">
                    Size
                  </Label>
                  <Input
                    id={`variantQuantityValue-${row.key}`}
                    name="variantQuantityValue"
                    type="number"
                    min={0}
                    step="0.001"
                    required
                    value={row.quantityValue}
                    onChange={(e) => updateRow(index, { quantityValue: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="w-24">
                  <Label htmlFor={`variantUnit-${row.key}`} className="text-xs">
                    Unit
                  </Label>
                  <Select
                    id={`variantUnit-${row.key}`}
                    name="variantUnit"
                    value={row.unit}
                    onChange={(e) => updateRow(index, { unit: e.target.value })}
                    className="h-9"
                  >
                    {VARIANT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {VARIANT_UNIT_FORM_LABEL[u]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-24">
                  <Label htmlFor={`variantPrice-${row.key}`} className="text-xs">
                    Price (Tk)
                  </Label>
                  <Input
                    id={`variantPrice-${row.key}`}
                    name="variantPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={row.price}
                    onChange={(e) => updateRow(index, { price: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="w-28">
                  <Label htmlFor={`variantCompareAtPrice-${row.key}`} className="text-xs">
                    Old price
                  </Label>
                  <Input
                    id={`variantCompareAtPrice-${row.key}`}
                    name="variantCompareAtPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.compareAtPrice}
                    onChange={(e) => updateRow(index, { compareAtPrice: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="w-20">
                  <Label htmlFor={`variantStock-${row.key}`} className="text-xs">
                    Stock
                  </Label>
                  <Input
                    id={`variantStock-${row.key}`}
                    name="variantStock"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={row.stock}
                    onChange={(e) => updateRow(index, { stock: e.target.value })}
                    className="h-9"
                  />
                </div>
                {row.id && <input type="hidden" name="variantId" value={row.id} />}
                {!row.id && <input type="hidden" name="variantId" value="" />}

                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="flex h-9 w-9 items-center justify-center rounded-control border border-border-brand text-brand-dark hover:bg-brand-bg disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move down"
                    className="flex h-9 w-9 items-center justify-center rounded-control border border-border-brand text-brand-dark hover:bg-brand-bg disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                    aria-label="Remove this option"
                    className="flex h-9 w-9 items-center justify-center rounded-control border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <label className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="radio"
                  name="_variantDefaultRadio"
                  checked={defaultIndex === index}
                  onChange={() => setDefaultIndex(index)}
                />
                Default option
                {row.quantityValue && row.unit && (
                  <span className="ml-1 font-medium text-brand-dark">
                    ({formatVariantLabel({ quantityValue: row.quantityValue || "0", unit: row.unit, packCount: row.packCount }, "en")})
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addBlankRow}
            className="flex items-center gap-1.5 rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add size/option
          </button>
          {QUICK_PACK_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => addPackRow(n)}
              className="flex items-center gap-1.5 rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />+ {n} pack
            </button>
          ))}
        </div>
      </div>

      <SubmitButton className="w-auto px-6">{isEdit ? "Save changes" : "Add product"}</SubmitButton>
    </form>
  );
}
