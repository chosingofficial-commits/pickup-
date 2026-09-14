"use client";

import { useActionState, useState } from "react";
import { rejectAdvertisementAction } from "@/lib/actions/admin-advertising";
import { initialActionState } from "@/lib/actions/types";

export function RejectAdForm({ advertisementId }: { advertisementId: string }) {
  const [state, formAction] = useActionState(rejectAdvertisementAction, initialActionState);
  const [show, setShow] = useState(false);

  if (state.status === "success") return <p className="text-xs text-red-600">{state.message}</p>;

  return show ? (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="advertisementId" value={advertisementId} />
      <input name="reason" placeholder="Reason" required className="h-8 flex-1 rounded-control border border-border-brand px-2 text-xs" />
      <button type="submit" className="rounded-control bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">
        Send
      </button>
    </form>
  ) : (
    <button type="button" onClick={() => setShow(true)} className="rounded-control border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
      Reject
    </button>
  );
}
