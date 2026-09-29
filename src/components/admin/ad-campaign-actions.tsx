"use client";

import { useActionState, useEffect, useState } from "react";
import {
  markAdPaymentPaidAction,
  pauseAdCampaignAction,
  resumeAdCampaignAction,
  updateAdCampaignDatesAction,
} from "@/lib/actions/admin-advertising";
import { initialActionState } from "@/lib/actions/types";

const AD_PAYMENT_METHODS = ["BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "CARD", "COD"];

export function MarkAdPaymentPaidForm({ paymentId, amountLabel }: { paymentId: string; amountLabel: string }) {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="rounded-control bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90">
        Mark paid ({amountLabel})
      </button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    if (!window.confirm(`Mark this ${amountLabel} payment as received via ${fd.get("method")}? This cannot be undone.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={markAdPaymentPaidAction} onSubmit={onSubmit} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="paymentId" value={paymentId} />
      <select name="method" required defaultValue="" className="h-8 rounded-control border border-border-brand px-2 text-xs">
        <option value="" disabled>
          Method
        </option>
        {AD_PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input name="reference" placeholder="Reference (optional)" className="h-8 w-32 rounded-control border border-border-brand px-2 text-xs" />
      <button type="submit" className="rounded-control bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90">
        Confirm paid
      </button>
      <button type="button" onClick={() => setShow(false)} className="text-xs text-gray-500 hover:underline">
        Cancel
      </button>
    </form>
  );
}

export function PauseResumeCampaignForm({ campaignId, isPaused }: { campaignId: string; isPaused: boolean }) {
  return (
    <form action={isPaused ? resumeAdCampaignAction : pauseAdCampaignAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <button type="submit" className="rounded-control border border-border-brand px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        {isPaused ? "Resume" : "Pause"}
      </button>
    </form>
  );
}

export function EditCampaignDatesForm({ campaignId, startDate, endDate }: { campaignId: string; startDate: string; endDate: string }) {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="rounded-control border border-border-brand px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        Edit dates
      </button>
    );
  }

  return (
    <EditCampaignDatesFields campaignId={campaignId} startDate={startDate} endDate={endDate} onCancel={() => setShow(false)} onSuccess={() => setShow(false)} />
  );
}

function EditCampaignDatesFields({
  campaignId,
  startDate,
  endDate,
  onCancel,
  onSuccess,
}: {
  campaignId: string;
  startDate: string;
  endDate: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(updateAdCampaignDatesAction, initialActionState);

  // Close the form on a successful save; stay open (showing the message) on
  // an error like "placement is full", so the admin can adjust the dates.
  useEffect(() => {
    if (state.status === "success") onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input name="startDate" type="date" defaultValue={startDate} required className="h-8 rounded-control border border-border-brand px-2 text-xs" />
      <input name="endDate" type="date" defaultValue={endDate} required className="h-8 rounded-control border border-border-brand px-2 text-xs" />
      <button type="submit" className="rounded-control bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90">
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:underline">
        Cancel
      </button>
      {state.status === "error" && <p className="w-full text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
