"use client";

import { useActionState } from "react";
import { findRiderAction } from "@/lib/actions/orders";
import { initialActionState } from "@/lib/actions/types";

export function FindRiderButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(findRiderAction, initialActionState);

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
      >
        {pending ? "Searching…" : "Find rider"}
      </button>
      {state.status !== "idle" && state.message && <p className={`text-xs ${state.status === "error" ? "text-red-600" : "text-emerald-700"}`}>{state.message}</p>}
    </form>
  );
}
