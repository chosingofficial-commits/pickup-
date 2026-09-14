"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlistAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, isSaved, className }: { productId: string; isSaved?: boolean; className?: string }) {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(toggleWishlistAction, initialActionState);
  const active = state.status === "success" ? !isSaved : isSaved;

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="redirectPath" value={pathname} />
      <button
        type="submit"
        disabled={pending}
        aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={active}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-soft transition-colors hover:bg-white",
          active ? "text-red-500" : "text-gray-400",
        )}
      >
        <Heart className="h-4 w-4" aria-hidden fill={active ? "currentColor" : "none"} />
      </button>
    </form>
  );
}
