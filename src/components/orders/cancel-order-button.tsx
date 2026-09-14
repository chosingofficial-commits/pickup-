"use client";

import { useActionState } from "react";
import { cancelOrderAsCustomerAction } from "@/lib/actions/orders";
import { initialActionState } from "@/lib/actions/types";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(cancelOrderAsCustomerAction, initialActionState);

  if (state.status === "success") {
    return <p className="text-sm text-gray-600">Order cancelled.</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      {state.status === "error" && <p className="mb-2 text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-control border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Cancel order
      </button>
    </form>
  );
}
