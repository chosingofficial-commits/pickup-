"use client";

import { useActionState, useState, useRef } from "react";
import {
  recordRiderHandoverAction,
  recordRiderPayoutAction,
  recordRiderAdjustmentAction,
  setRiderCommissionRateAction,
} from "@/lib/actions/admin-riders";
import { initialActionState } from "@/lib/actions/types";

/**
 * Generated once per mount (not per render/resubmit) — a real double-click or
 * resubmit-after-error carries the SAME key, so the server can recognize and
 * ignore the duplicate instead of double-recording the entry.
 */
function useIdempotencyKey() {
  const [key] = useState(() => crypto.randomUUID());
  return key;
}

function FormMessage({ status, message }: { status: string; message?: string }) {
  if (status === "idle" || !message) return null;
  return <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>;
}

export function RiderHandoverForm({ riderId, riderName }: { riderId: string; riderName: string }) {
  const [state, formAction, pending] = useActionState(recordRiderHandoverAction, initialActionState);
  const idempotencyKey = useIdempotencyKey();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const amount = new FormData(e.currentTarget).get("amount");
    if (!window.confirm(`Record a Tk ${amount} cash handover from ${riderName}? This cannot be undone — corrections require a separate adjustment entry.`)) {
      e.preventDefault();
    }
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="space-y-2 rounded-control border border-border-brand p-3">
      <h3 className="text-xs font-semibold text-brand-dark">Record cash handover</h3>
      <input type="hidden" name="riderId" value={riderId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount (Tk)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <input name="note" placeholder="Note (optional)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <button type="submit" disabled={pending} className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Record handover"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export const PAYOUT_METHODS = ["bKash", "Nagad", "Bank transfer", "Cash"];

export function RiderPayoutForm({ riderId, riderName }: { riderId: string; riderName: string }) {
  const [state, formAction, pending] = useActionState(recordRiderPayoutAction, initialActionState);
  const idempotencyKey = useIdempotencyKey();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    if (!window.confirm(`Record a Tk ${fd.get("amount")} payout to ${riderName} via ${fd.get("payoutMethod")}? This cannot be undone.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-2 rounded-control border border-border-brand p-3">
      <h3 className="text-xs font-semibold text-brand-dark">Record payout</h3>
      <input type="hidden" name="riderId" value={riderId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount (Tk)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <select name="payoutMethod" required defaultValue="" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs">
        <option value="" disabled>
          Payout method
        </option>
        {PAYOUT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input name="referenceNo" placeholder="Reference number (optional)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <input name="note" placeholder="Note (optional)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <button type="submit" disabled={pending} className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Record payout"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function RiderAdjustmentForm({ riderId, riderName }: { riderId: string; riderName: string }) {
  const [state, formAction, pending] = useActionState(recordRiderAdjustmentAction, initialActionState);
  const idempotencyKey = useIdempotencyKey();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const direction = fd.get("direction") === "increase" ? "increase what they owe by" : "decrease what they owe by (or increase what's owed to them)";
    if (!window.confirm(`Adjust ${riderName}'s balance to ${direction} Tk ${fd.get("amount")}? This cannot be undone — record another adjustment to reverse it if needed.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-2 rounded-control border border-border-brand p-3">
      <h3 className="text-xs font-semibold text-brand-dark">Record adjustment</h3>
      <input type="hidden" name="riderId" value={riderId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <select name="direction" required defaultValue="" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs">
        <option value="" disabled>
          Direction
        </option>
        <option value="increase">Increase what the rider owes</option>
        <option value="decrease">Decrease what the rider owes (or increase what&apos;s owed to them)</option>
      </select>
      <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount (Tk)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <input name="note" required placeholder="Reason (required)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <button type="submit" disabled={pending} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60">
        {pending ? "Saving…" : "Record adjustment"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

/**
 * Quick-settle action for the list/detail balance badge: "Mark as paid" for
 * a rider who owes (records a CASH_HANDOVER) or "Pay rider" for one the
 * platform owes (records a PAYOUT) — both prefilled with the full balance
 * but editable, so a partial settlement just leaves the correct remainder.
 */
export function RiderMarkPaidAction({ riderId, riderName, balancePoisha }: { riderId: string; riderName: string; balancePoisha: number }) {
  const isOwedToUs = balancePoisha > 0;
  const [open, setOpen] = useState(false);
  const [handoverState, handoverAction, handoverPending] = useActionState(recordRiderHandoverAction, initialActionState);
  const [payoutState, payoutAction, payoutPending] = useActionState(recordRiderPayoutAction, initialActionState);
  const state = isOwedToUs ? handoverState : payoutState;

  // Regenerated after every successful save (not just once per mount) — this
  // panel can stay open across a partial payment followed by another one for
  // the remainder, and each of those must get its own idempotency key. Adjusting
  // state during render (rather than in an effect) avoids an extra render pass.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (state.status === "success") setIdempotencyKey(crypto.randomUUID());
  }

  if (balancePoisha === 0) return null;
  const action = isOwedToUs ? handoverAction : payoutAction;
  const pending = isOwedToUs ? handoverPending : payoutPending;
  const defaultAmount = (Math.abs(balancePoisha) / 100).toFixed(2);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const amount = new FormData(e.currentTarget).get("amount");
    const verb = isOwedToUs ? `Record Tk ${amount} received from` : `Send a Tk ${amount} payout to`;
    if (!window.confirm(`${verb} ${riderName}? This cannot be undone — corrections require a separate adjustment entry.`)) {
      e.preventDefault();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-control border border-border-brand bg-white px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-bg"
      >
        {isOwedToUs ? "Mark as paid" : "Pay rider"}
      </button>
    );
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-2 rounded-control border border-border-brand p-3">
      <h3 className="text-xs font-semibold text-brand-dark">{isOwedToUs ? "Mark as paid" : "Pay rider"}</h3>
      <input type="hidden" name="riderId" value={riderId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input name="amount" type="number" min="0.01" step="0.01" required defaultValue={defaultAmount} placeholder="Amount (Tk)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <select name="payoutMethod" required defaultValue="" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs">
        <option value="" disabled>
          Method
        </option>
        {PAYOUT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input name="referenceNo" placeholder="Reference number (optional)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <input name="note" placeholder="Note (optional)" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
          {pending ? "Saving…" : isOwedToUs ? "Confirm received" : "Confirm payout"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Cancel
        </button>
      </div>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function RiderCommissionRateForm({ riderId, currentRatePct }: { riderId: string; currentRatePct: number }) {
  const [state, formAction, pending] = useActionState(setRiderCommissionRateAction, initialActionState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="riderId" value={riderId} />
      <div>
        <label htmlFor="commissionRatePct" className="mb-1 block text-xs font-semibold text-brand-dark">
          Commission rate (%)
        </label>
        <input
          id="commissionRatePct"
          name="commissionRatePct"
          type="number"
          min="0"
          max="100"
          step="0.5"
          defaultValue={currentRatePct}
          className="h-9 w-28 rounded-control border border-border-brand px-2.5 text-xs"
        />
      </div>
      <button type="submit" disabled={pending} className="rounded-control border border-border-brand bg-white px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60">
        {pending ? "Saving…" : "Save rate"}
      </button>
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
