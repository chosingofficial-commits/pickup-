"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { addProductToCartAction, buyNowAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { WishlistButton } from "./wishlist-button";
import { ShareButton } from "./share-button";

export function PurchasePanel({ productId, productName, isSaved }: { productId: string; productName: string; isSaved?: boolean }) {
  const pathname = usePathname();
  const [quantity, setQuantity] = useState(1);
  const [state, formAction, pending] = useActionState(addProductToCartAction, initialActionState);

  return (
    <div className="space-y-4">
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
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="redirectPath" value={pathname} />
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-primary font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {state.status === "success" ? "Added to cart" : "Add to cart"}
          </button>
        </form>

        <form action={buyNowAction} className="flex-1 min-w-[160px]">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-brand-primary font-semibold text-brand-primary hover:bg-brand-bg"
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
