"use client";

import { useRef } from "react";
import { updateAdPricingAction, updateAdPlacementMaxAdsAction } from "@/lib/actions/admin-advertising";

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
        step={1}
        onBlur={() => formRef.current?.requestSubmit()}
        className="h-8 w-20 rounded-control border border-border-brand px-2 text-xs"
      />
    </form>
  );
}

export function AdMaxConcurrentInput({ placementId, maxConcurrentAds }: { placementId: string; maxConcurrentAds: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateAdPlacementMaxAdsAction} className="flex items-center gap-1">
      <input type="hidden" name="placementId" value={placementId} />
      <span className="text-xs text-gray-500">Max ads at once</span>
      <input
        type="number"
        name="maxConcurrentAds"
        defaultValue={maxConcurrentAds}
        min={1}
        step={1}
        onBlur={() => formRef.current?.requestSubmit()}
        className="h-8 w-16 rounded-control border border-border-brand px-2 text-xs"
      />
    </form>
  );
}
