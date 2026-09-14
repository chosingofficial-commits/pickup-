"use client";

import { useActionState } from "react";
import { advanceOrderStatusAction } from "@/lib/actions/orders";
import { initialActionState } from "@/lib/actions/types";
import { statusLabel } from "@/lib/orders/status-flow";
import type { OrderStatus } from "@/generated/prisma/client";

export function OrderStatusActions({ orderId, nextOptions }: { orderId: string; nextOptions: OrderStatus[] }) {
  const [state, formAction, pending] = useActionState(advanceOrderStatusAction, initialActionState);

  if (nextOptions.length === 0) return null;

  return (
    <div className="space-y-2">
      {state.status === "error" && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {nextOptions.map((next) => (
          <form key={next} action={formAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="nextStatus" value={next} />
            <button
              type="submit"
              disabled={pending}
              className={
                next === "CANCELLED" || next === "FAILED_DELIVERY"
                  ? "rounded-control border border-red-300 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  : "rounded-control bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              }
            >
              Mark as {statusLabel(next)}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
