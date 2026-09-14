"use client";

import { useActionState, useState } from "react";
import { requestRefundAction } from "@/lib/actions/refunds";
import { initialActionState } from "@/lib/actions/types";

export function RequestRefundForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(requestRefundAction, initialActionState);
  const [show, setShow] = useState(false);

  if (state.status === "success") return <p className="text-sm text-brand-primary">{state.message}</p>;

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="text-sm font-semibold text-brand-primary hover:underline">
        Request a refund
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea name="reason" rows={2} placeholder="What went wrong?" required className="w-full rounded-control border border-border-brand px-3 py-2 text-sm" />
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
      <button type="submit" className="rounded-control bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover">
        Submit request
      </button>
    </form>
  );
}
