"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import { addProductToCartAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

export function AddToCartButton({ productId, className, compact }: { productId: string; className?: string; compact?: boolean }) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(addProductToCartAction, initialActionState);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (state.status !== "success") return;
    // Intentional: flash a temporary "Added" confirmation after the action
    // completes, then clear it — there's no external store to derive this
    // from during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJustAdded(true);
    const t = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={1} />
      <input type="hidden" name="redirectPath" value={pathname} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Add to cart"
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-control bg-brand-primary font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-60",
          compact ? "h-9 w-9" : "h-10 w-full text-sm",
          className,
        )}
      >
        {justAdded ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        {!compact && <span>{justAdded ? "Added" : "Add to cart"}</span>}
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
