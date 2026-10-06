"use client";

import { useActionState } from "react";
import { advanceOrderStatusAction } from "@/lib/actions/orders";
import { initialActionState } from "@/lib/actions/types";
import { statusLabel } from "@/lib/orders/status-flow";
import type { OrderStatus } from "@/generated/prisma/client";

export function OrderStatusActions({
  orderId,
  nextOptions,
  size = "sm",
}: {
  orderId: string;
  nextOptions: OrderStatus[];
  /** "lg" = large, tap-friendly buttons (full-width on mobile) — used on the rider's delivery cards. */
  size?: "sm" | "lg";
}) {
  const [state, formAction, pending] = useActionState(advanceOrderStatusAction, initialActionState);

  if (nextOptions.length === 0) return null;

  const buttonClassName =
    size === "lg"
      ? "flex-1 rounded-control px-4 py-3.5 text-sm font-semibold disabled:opacity-60 sm:flex-none"
      : "rounded-control px-3.5 py-2 text-xs font-semibold disabled:opacity-60";

  return (
    <div className="space-y-2">
      {state.status === "error" && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {nextOptions.map((next) => (
          <form key={next} action={formAction} className={size === "lg" ? "flex-1 sm:flex-none" : undefined}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="nextStatus" value={next} />
            <button
              type="submit"
              disabled={pending}
              className={`w-full ${buttonClassName} ${
                next === "CANCELLED" || next === "FAILED_DELIVERY"
                  ? "border border-red-300 text-red-600 hover:bg-red-50"
                  : "bg-brand-primary text-white hover:bg-brand-primary-hover"
              }`}
            >
              Mark as {statusLabel(next)}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
