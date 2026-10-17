"use client";

import { useState } from "react";
import { updatePayoutStatusAction } from "@/lib/actions/admin-payouts";
import { formatBDT } from "@/lib/utils";

const buttonBase = "rounded-control px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton = `${buttonBase} border border-border-brand text-brand-dark hover:bg-brand-bg`;
const dangerButton = `${buttonBase} border border-red-200 text-red-600 hover:bg-red-50`;
const primaryButton = `${buttonBase} bg-brand-primary text-white hover:bg-brand-primary-hover`;

export function PayoutActions({
  payoutId,
  status,
  canBePaid,
  ineligibleReason,
  vendorName,
  amountTk,
  payoutDestination,
}: {
  payoutId: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  canBePaid: boolean;
  ineligibleReason?: string;
  vendorName: string;
  amountTk: number;
  payoutDestination: string | null;
}) {
  const [rejecting, setRejecting] = useState(false);

  if (status === "PAID" || status === "REJECTED") return null;

  return (
    <div className="space-y-2">
      {!canBePaid && ineligibleReason && <p className="text-xs font-medium text-red-600">{ineligibleReason}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {status === "PENDING" && (
          <form action={updatePayoutStatusAction}>
            <input type="hidden" name="payoutId" value={payoutId} />
            <input type="hidden" name="status" value="APPROVED" />
            <button type="submit" disabled={!canBePaid} className={outlineButton}>
              Approve
            </button>
          </form>
        )}

        {status === "APPROVED" && (
          <form
            action={updatePayoutStatusAction}
            onSubmit={(e) => {
              const method = payoutDestination ? ` via ${payoutDestination}` : "";
              if (!window.confirm(`Confirm you have sent ${formatBDT(amountTk)} to ${vendorName}${method}.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="payoutId" value={payoutId} />
            <input type="hidden" name="status" value="PAID" />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                name="referenceNo"
                placeholder="Transaction ref (optional)"
                className="h-9 w-48 rounded-control border border-border-brand px-2.5 text-xs"
              />
              <button type="submit" disabled={!canBePaid} className={primaryButton}>
                Mark as paid
              </button>
            </div>
          </form>
        )}

        {!rejecting && (
          <button type="button" onClick={() => setRejecting(true)} className={dangerButton}>
            Reject
          </button>
        )}
      </div>

      {rejecting && (
        <form action={updatePayoutStatusAction} className="flex flex-wrap items-start gap-2">
          <input type="hidden" name="payoutId" value={payoutId} />
          <input type="hidden" name="status" value="REJECTED" />
          <textarea
            name="reason"
            required
            placeholder="Reason for rejecting (required)"
            rows={2}
            className="h-16 w-64 rounded-control border border-border-brand px-2.5 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button type="submit" className={dangerButton}>
              Confirm reject
            </button>
            <button type="button" onClick={() => setRejecting(false)} className={outlineButton}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
