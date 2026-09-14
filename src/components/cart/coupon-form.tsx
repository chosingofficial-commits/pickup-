"use client";

import { useActionState } from "react";
import { Tag, X } from "lucide-react";
import { applyCouponAction, removeCouponAction } from "@/lib/actions/coupon";
import { initialActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";

export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const [state, formAction, pending] = useActionState(applyCouponAction, initialActionState);

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-control bg-brand-bg px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-brand-dark">
          <Tag className="h-4 w-4 text-brand-primary" aria-hidden />
          {appliedCode} applied
        </span>
        <form action={removeCouponAction}>
          <button type="submit" aria-label="Remove coupon" className="text-gray-500 hover:text-red-600">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-1.5">
      <div className="flex gap-2">
        <Input name="code" placeholder="Coupon code" aria-label="Coupon code" className="flex-1" />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-bg disabled:opacity-60"
        >
          Apply
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="text-xs text-brand-primary">
          {state.message}
        </p>
      )}
    </form>
  );
}
