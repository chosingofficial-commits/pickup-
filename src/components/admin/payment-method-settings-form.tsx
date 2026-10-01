"use client";

import { useActionState } from "react";
import { updatePaymentMethodSettingsAction } from "@/lib/actions/admin-settings";
import { initialActionState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/forms/submit-button";
import type { PaymentProvider } from "@/generated/prisma/client";

export type PaymentMethodRow = { provider: PaymentProvider; label: string; enabled: boolean; live: boolean };

export function PaymentMethodSettingsForm({ rows }: { rows: PaymentMethodRow[] }) {
  const [state, formAction] = useActionState(updatePaymentMethodSettingsAction, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {state.status === "error" && state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <div className="space-y-2">
        {rows.map((row) => (
          <label
            key={row.provider}
            className={`flex items-center justify-between gap-3 rounded-control border p-3 ${
              row.live ? "border-border-brand has-[:checked]:border-brand-primary has-[:checked]:bg-brand-bg" : "border-border-brand bg-surface-muted"
            }`}
          >
            <span>
              <span className={`block text-sm font-semibold ${row.live ? "text-brand-dark" : "text-gray-400"}`}>{row.label}</span>
              {!row.live && <span className="text-xs text-gray-500">Not connected yet — add live credentials to enable this method</span>}
            </span>
            <input type="checkbox" name={`enabled_${row.provider}`} value="1" defaultChecked={row.enabled && row.live} disabled={!row.live} className="h-4 w-4 shrink-0" />
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-500">Only Cash on delivery and gateways with live credentials configured can be switched on. Checkout only shows the methods enabled here.</p>

      <SubmitButton className="w-auto px-6">Save payment methods</SubmitButton>
    </form>
  );
}
