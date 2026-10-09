"use client";

import { useRef, useActionState } from "react";
import { updateVendorCommissionAction } from "@/lib/actions/admin-vendors";
import { initialActionState } from "@/lib/actions/types";

export function CommissionRateEditor({ vendorId, value }: { vendorId: string; value: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(updateVendorCommissionAction, initialActionState);

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex items-center gap-1">
        <input type="hidden" name="vendorId" value={vendorId} />
        <input
          type="number"
          name="commissionRatePct"
          defaultValue={value}
          min={0}
          max={100}
          step="0.5"
          onBlur={() => formRef.current?.requestSubmit()}
          className="h-8 w-16 rounded-control border border-border-brand px-2 text-xs"
          aria-label="Commission rate percent"
        />
        <span className="text-xs text-gray-500">%</span>
      </form>
      {state.status === "error" && <p className="mt-0.5 text-xs text-red-600">{state.message}</p>}
    </div>
  );
}
