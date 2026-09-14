"use client";

import { useRef } from "react";
import { setAvailabilityAction } from "@/lib/actions/vendor-products";
import type { ProductAvailability } from "@/generated/prisma/client";

export function AvailabilitySelect({ productId, value }: { productId: string; value: ProductAvailability }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setAvailabilityAction}>
      <input type="hidden" name="productId" value={productId} />
      <select
        name="availability"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 rounded-control border border-border-brand bg-white px-2 text-xs"
        aria-label="Availability"
      >
        <option value="AVAILABLE">Available</option>
        <option value="OUT_OF_STOCK">Out of stock</option>
        <option value="TEMPORARILY_UNAVAILABLE">Temporarily unavailable</option>
      </select>
    </form>
  );
}
