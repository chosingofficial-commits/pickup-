"use client";

import { useRef } from "react";
import { updateDeliveryZoneAction, toggleDeliveryZoneActiveAction } from "@/lib/actions/admin-locations";
import { Badge } from "@/components/ui/badge";

export function DeliveryZoneRow({
  zoneId,
  name,
  deliveryFee,
  estimatedMinutesMin,
  estimatedMinutesMax,
  isActive,
}: {
  zoneId: string;
  name: string;
  deliveryFee: number;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  isActive: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-border-brand p-3">
      <span className="min-w-[120px] text-sm font-medium text-brand-dark">{name}</span>
      <form ref={formRef} action={updateDeliveryZoneAction} className="flex items-center gap-2">
        <input type="hidden" name="zoneId" value={zoneId} />
        <label className="flex items-center gap-1 text-xs text-gray-500">
          Tk
          <input
            type="number"
            name="deliveryFee"
            defaultValue={deliveryFee}
            min={0}
            onBlur={() => formRef.current?.requestSubmit()}
            className="h-8 w-16 rounded-control border border-border-brand px-2 text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="number"
            name="estimatedMinutesMin"
            defaultValue={estimatedMinutesMin}
            min={1}
            onBlur={() => formRef.current?.requestSubmit()}
            className="h-8 w-14 rounded-control border border-border-brand px-2 text-xs"
          />
          –
          <input
            type="number"
            name="estimatedMinutesMax"
            defaultValue={estimatedMinutesMax}
            min={1}
            onBlur={() => formRef.current?.requestSubmit()}
            className="h-8 w-14 rounded-control border border-border-brand px-2 text-xs"
          />
          min
        </label>
      </form>
      <Badge variant={isActive ? "brand" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>
      <form action={toggleDeliveryZoneActiveAction}>
        <input type="hidden" name="zoneId" value={zoneId} />
        <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          {isActive ? "Disable" : "Enable"}
        </button>
      </form>
    </div>
  );
}
