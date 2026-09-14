"use client";

import { useState } from "react";
import { selectScheduleAction } from "@/lib/actions/checkout";
import { Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

const MIN_ADVANCE_MS = 24 * 60 * 60 * 1000;

function minDateTimeLocal(advanceMs: number): string {
  const d = new Date(Date.now() + advanceMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleForm({ requiresAdvanceScheduling = false }: { requiresAdvanceScheduling?: boolean }) {
  const [mode, setMode] = useState<"now" | "later">(requiresAdvanceScheduling ? "later" : "now");
  const minAdvanceMs = requiresAdvanceScheduling ? MIN_ADVANCE_MS : 30 * 60 * 1000;

  return (
    <form action={selectScheduleAction} className="space-y-4">
      <div className="space-y-2">
        {!requiresAdvanceScheduling && (
          <label className="flex items-center gap-3 rounded-control border border-border-brand p-3 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-bg">
            <input type="radio" name="mode" value="now" checked={mode === "now"} onChange={() => setMode("now")} />
            <span>
              <span className="block text-sm font-semibold text-brand-dark">As soon as possible</span>
              <span className="block text-xs text-gray-500">We&apos;ll start preparing your order right away.</span>
            </span>
          </label>
        )}
        <label className="flex items-center gap-3 rounded-control border border-border-brand p-3 has-[:checked]:border-brand-primary has-[:checked]:bg-brand-bg">
          <input type="radio" name="mode" value="later" checked={mode === "later"} onChange={() => setMode("later")} />
          <span className="block text-sm font-semibold text-brand-dark">
            {requiresAdvanceScheduling ? "Schedule delivery (required)" : "Schedule for later"}
          </span>
        </label>
      </div>

      {mode === "later" && (
        <div>
          <Label htmlFor="scheduledFor">Delivery time</Label>
          <input
            id="scheduledFor"
            name="scheduledFor"
            type="datetime-local"
            min={minDateTimeLocal(minAdvanceMs)}
            required
            className="h-11 w-full rounded-control border border-border-brand bg-white px-3.5 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            {requiresAdvanceScheduling
              ? "Weekly grocery picks are batch-fulfilled, so the earliest slot is 24 hours from now."
              : "Restaurants that are closed will prepare your order at the scheduled time."}
          </p>
        </div>
      )}

      <SubmitButton>Continue to payment</SubmitButton>
    </form>
  );
}
