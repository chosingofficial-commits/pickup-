"use client";

import { useActionState, useMemo, useState } from "react";
import { createAdCampaignAction } from "@/lib/actions/admin-advertising";
import { initialActionState } from "@/lib/actions/types";
import { cheapestAdPrice, formatAdPriceBreakdown } from "@/lib/ads/pricing";
import { bdDateRangeDays } from "@/lib/date/bd-time";
import { formatBDT } from "@/lib/utils";

export type PlacementOption = { id: string; code: string; name: string; dailyPrice: number; weeklyPrice: number; monthlyPrice: number };

export function CreateCampaignForm({ advertisementId, placements }: { advertisementId: string; placements: PlacementOption[] }) {
  const [state, formAction] = useActionState(createAdCampaignAction, initialActionState);
  const [show, setShow] = useState(false);
  const [placementId, setPlacementId] = useState(placements[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typedAmount, setTypedAmount] = useState<string | null>(null);

  const selectedPlacement = placements.find((p) => p.id === placementId);
  const days = startDate && endDate && endDate > startDate ? bdDateRangeDays(startDate, endDate) : 0;
  const estimate = useMemo(
    () =>
      selectedPlacement && days > 0
        ? cheapestAdPrice(days, { daily: selectedPlacement.dailyPrice, weekly: selectedPlacement.weeklyPrice, monthly: selectedPlacement.monthlyPrice })
        : null,
    [selectedPlacement, days],
  );
  // Suggest the cheapest-combination price, but let the admin override it —
  // derived at render time (not synced via effect) so it can't cascade.
  const amount = typedAmount ?? (estimate ? String(estimate.total) : "");

  if (state.status === "success") return <p className="text-xs text-brand-primary">{state.message}</p>;
  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="rounded-control bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
        Create campaign
      </button>
    );
  }

  return (
    <form action={formAction} className="grid gap-2 rounded-control bg-surface-muted p-3 sm:grid-cols-2">
      <input type="hidden" name="advertisementId" value={advertisementId} />
      <select
        name="placementId"
        required
        value={placementId}
        onChange={(e) => setPlacementId(e.target.value)}
        className="h-9 rounded-control border border-border-brand px-2 text-xs"
      >
        {placements.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} (Tk {p.dailyPrice}/day)
          </option>
        ))}
      </select>
      <input
        name="amount"
        type="number"
        min="0"
        step="1"
        placeholder="Amount (Tk)"
        required
        value={amount}
        onChange={(e) => setTypedAmount(e.target.value)}
        className="h-9 rounded-control border border-border-brand px-2 text-xs"
      />
      <input name="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 rounded-control border border-border-brand px-2 text-xs" />
      <input name="endDate" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 rounded-control border border-border-brand px-2 text-xs" />
      {estimate && (
        <p className="col-span-2 text-xs text-gray-600">
          Cheapest combination: {formatAdPriceBreakdown(estimate)} = {formatBDT(estimate.total)}
          {typedAmount != null && Number(typedAmount) !== estimate.total && " (amount above overrides this)"}
        </p>
      )}
      <button type="submit" className="col-span-2 rounded-control bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover">
        Save campaign
      </button>
      {state.status === "error" && <p className="col-span-2 text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
