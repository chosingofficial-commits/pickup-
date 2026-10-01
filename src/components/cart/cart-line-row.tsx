"use client";

import { useActionState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { updateCartItemQuantityAction, removeCartItemAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { ProductImage } from "@/components/product/product-image";
import { formatBDT } from "@/lib/utils";
import { formatVariantLabel } from "@/lib/catalog/variant-label";
import { useLocale } from "@/components/providers/locale-provider";
import type { NormalizedCartLine } from "@/lib/cart/queries";

export function CartLineRow({ line }: { line: NormalizedCartLine }) {
  const { locale } = useLocale();
  const [, updateAction] = useActionState(updateCartItemQuantityAction, initialActionState);
  const [, removeAction] = useActionState(removeCartItemAction, initialActionState);
  const [isPending, startTransition] = useTransition();
  const sizeLabel = line.variant ? formatVariantLabel(line.variant, locale) : line.unit;

  function setQuantity(next: number) {
    const form = new FormData();
    form.set("itemId", line.id);
    form.set("quantity", String(next));
    startTransition(() => updateAction(form));
  }

  const unitLineTotal = (line.unitPrice + line.addOnsTotal) * line.quantity;

  return (
    <div className="flex gap-3 border-b border-border-brand py-4 last:border-0">
      <ProductImage src={line.imageUrl} alt={line.name} categorySlug={line.categorySlug} className="h-16 w-16 shrink-0 rounded-control" />
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-brand-dark">{line.name}</p>
            {sizeLabel && <p className="text-xs text-gray-500">{sizeLabel}</p>}
            {line.selectedAddOns.length > 0 && (
              <p className="text-xs text-gray-500">{line.selectedAddOns.map((a) => a.name).join(", ")}</p>
            )}
            {line.specialInstructions && (
              <p className="text-xs italic text-gray-400">&ldquo;{line.specialInstructions}&rdquo;</p>
            )}
            {!line.isAvailable && <p className="text-xs font-semibold text-red-600">No longer available</p>}
          </div>
          <p className="whitespace-nowrap text-sm font-bold text-brand-dark">{formatBDT(unitLineTotal)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded-control border border-border-brand">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={isPending}
              onClick={() => setQuantity(Math.max(0, line.quantity - 1))}
              className="flex h-8 w-8 items-center justify-center text-brand-dark hover:bg-brand-bg disabled:opacity-50"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={isPending}
              onClick={() => setQuantity(line.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center text-brand-dark hover:bg-brand-bg disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <form action={removeAction}>
            <input type="hidden" name="itemId" value={line.id} />
            <button type="submit" aria-label="Remove item" className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
