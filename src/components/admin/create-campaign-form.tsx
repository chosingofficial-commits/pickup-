"use client";

import { useActionState, useState } from "react";
import { createAdCampaignAction } from "@/lib/actions/admin-advertising";
import { initialActionState } from "@/lib/actions/types";

export type PlacementOption = { id: string; code: string; name: string; dailyPrice: number };

export function CreateCampaignForm({ advertisementId, placements }: { advertisementId: string; placements: PlacementOption[] }) {
  const [state, formAction] = useActionState(createAdCampaignAction, initialActionState);
  const [show, setShow] = useState(false);

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
      <select name="placementId" required className="h-9 rounded-control border border-border-brand px-2 text-xs">
        {placements.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} (৳{p.dailyPrice}/day)
          </option>
        ))}
      </select>
      <input name="amount" type="number" min="0" step="0.01" placeholder="Amount (৳)" required className="h-9 rounded-control border border-border-brand px-2 text-xs" />
      <input name="startDate" type="date" required className="h-9 rounded-control border border-border-brand px-2 text-xs" />
      <input name="endDate" type="date" required className="h-9 rounded-control border border-border-brand px-2 text-xs" />
      <button type="submit" className="col-span-2 rounded-control bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover">
        Save campaign
      </button>
      {state.status === "error" && <p className="col-span-2 text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
