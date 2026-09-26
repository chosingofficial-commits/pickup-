"use client";

import { useRef } from "react";
import { updateAdPricingAction } from "@/lib/actions/admin-advertising";

export function AdPricingInput({ pricingId, price }: { pricingId: string; price: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateAdPricingAction} className="flex items-center gap-1">
      <input type="hidden" name="pricingId" value={pricingId} />
      <span className="text-xs text-gray-500">Tk</span>
      <input
        type="number"
        name="price"
        defaultValue={price}
        min={0}
        onBlur={() => formRef.current?.requestSubmit()}
        className="h-8 w-20 rounded-control border border-border-brand px-2 text-xs"
      />
    </form>
  );
}
