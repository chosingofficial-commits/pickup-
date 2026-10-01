"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { addProductToCartAction, buyNowAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { WishlistButton } from "./wishlist-button";
import { ShareButton } from "./share-button";
import { formatVariantLabel } from "@/lib/catalog/variant-label";
import { useLocale } from "@/components/providers/locale-provider";
import { formatBDT, cn } from "@/lib/utils";

export type PurchaseVariant = {
  id: string;
  quantityValue: string;
  unit: string;
  packCount: number;
  price: number;
  compareAtPrice: number | null;
  stockQty: number;
  isActive: boolean;
  isDefault: boolean;
};

export function PurchasePanel({
  productId,
  productName,
  productUnit,
  variants,
  isSaved,
}: {
  productId: string;
  productName: string;
  /** Product.unit — the pre-existing free-text size (backfilled products) or
   * the single option's own label kept in sync (new products). Shown as-is,
   * with no size picker, whenever there's only one active option, so a
   * single-option product looks exactly like it did before variants existed. */
  productUnit: string;
  variants: PurchaseVariant[];
  isSaved?: boolean;
}) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const [quantity, setQuantity] = useState(1);
  const [state, formAction, pending] = useActionState(addProductToCartAction, initialActionState);

  const activeVariants = variants.filter((v) => v.isActive);
  const inStock = activeVariants.filter((v) => v.stockQty > 0);
  const initialSelected = inStock.find((v) => v.isDefault) ?? inStock[0] ?? activeVariants[0] ?? variants[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelected?.id);
  const selected = activeVariants.find((v) => v.id === selectedId) ?? initialSelected;

  const allSoldOut = activeVariants.length === 0 || activeVariants.every((v) => v.stockQty <= 0);
  const hasMultipleOptions = activeVariants.length > 1;

  if (!selected) return null;

  return (
    <div className="space-y-4">
      {hasMultipleOptions && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-brand-dark">Select unit</p>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" role="radiogroup" aria-label="Select unit">
            {activeVariants.map((v) => {
              const soldOut = v.stockQty <= 0;
              const isSelected = v.id === selected.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={soldOut}
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "flex min-w-[100px] shrink-0 flex-col items-start gap-0.5 rounded-control border-2 px-3 py-2 text-left transition-colors",
                    isSelected ? "border-brand-primary bg-brand-bg" : "border-border-brand bg-white hover:border-brand-primary/50",
                    soldOut && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="text-sm font-semibold text-brand-dark">{formatVariantLabel(v, locale)}</span>
                  {soldOut ? (
                    <span className="text-xs font-semibold text-red-600">Sold out</span>
                  ) : (
                    <span className="text-xs">
                      <span className="font-medium text-brand-dark">{formatBDT(v.price)}</span>
                      {v.compareAtPrice && <span className="ml-1 text-gray-400 line-through">{formatBDT(v.compareAtPrice)}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm text-gray-500">{hasMultipleOptions ? formatVariantLabel(selected, locale) : productUnit}</p>
        <div className="mt-0.5 flex items-baseline gap-3">
          <span className="font-heading text-3xl font-bold text-brand-dark">{formatBDT(selected.price)}</span>
          {selected.compareAtPrice && <span className="text-lg text-gray-400 line-through">{formatBDT(selected.compareAtPrice)}</span>}
        </div>
        {selected.stockQty > 0 ? (
          <p className="mt-1 text-sm text-gray-600">{selected.stockQty > 50 ? "50+ in stock" : `${selected.stockQty} in stock`}</p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-red-600">Sold out</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-brand-dark">Quantity</span>
        <div className="flex items-center rounded-control border border-border-brand">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-brand-dark hover:bg-brand-bg"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="w-10 text-center text-sm font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-brand-dark hover:bg-brand-bg"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={formAction} className="flex-1 min-w-[160px]">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selected.id} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="redirectPath" value={pathname} />
          <button
            type="submit"
            disabled={pending || allSoldOut || selected.stockQty <= 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-primary font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {state.status === "success" ? "Added to cart" : "Add to cart"}
          </button>
        </form>

        <form action={buyNowAction} className="flex-1 min-w-[160px]">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={selected.id} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            type="submit"
            disabled={allSoldOut || selected.stockQty <= 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-brand-primary font-semibold text-brand-primary hover:bg-brand-bg disabled:opacity-60"
          >
            <Zap className="h-4 w-4" aria-hidden />
            Buy now
          </button>
        </form>

        <div className="flex h-12 items-center">
          <WishlistButton productId={productId} isSaved={isSaved} />
        </div>
        <ShareButton title={productName} />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
