"use client";

import { useActionState, useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { adminCancelOrderAction, adminAssignRiderAction } from "@/lib/actions/admin-orders";
import { requestRefundAction } from "@/lib/actions/refunds";
import { initialActionState } from "@/lib/actions/types";

type Contact = { name: string; phone: string };

export type OrderAdminActionsProps = {
  orderId: string;
  canCancel: boolean;
  canRefund: boolean;
  canAssignRider: boolean;
  riders: { id: string; name: string; phone: string }[];
  currentRiderId: string | null;
  contacts: { customer: Contact; vendor: Contact; rider: Contact | null };
};

function FormMessage({ status, message }: { status: string; message?: string }) {
  if (status === "idle" || !message) return null;
  return <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>;
}

function ContactButtons({ label, contact }: { label: string; contact: Contact | null }) {
  if (!contact) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-control border border-border-brand p-2.5 text-sm">
      <div>
        <p className="font-semibold text-brand-dark">{label}</p>
        <p className="text-xs text-gray-500">
          {contact.name} · {contact.phone}
        </p>
      </div>
      <div className="flex gap-1.5">
        <a href={`tel:${contact.phone}`} aria-label={`Call ${label.toLowerCase()}`} className="flex h-8 w-8 items-center justify-center rounded-control border border-border-brand text-brand-dark hover:bg-brand-bg">
          <Phone className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={`https://wa.me/${contact.phone.replace(/[^\d]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-control border border-border-brand text-brand-dark hover:bg-brand-bg"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function CancelOrderAction({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(adminCancelOrderAction, initialActionState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") return <p className="text-sm text-brand-primary">{state.message}</p>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
        Cancel order
      </button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const reason = new FormData(e.currentTarget).get("reason");
    if (!reason || !String(reason).trim()) {
      e.preventDefault();
      return;
    }
    if (!window.confirm("Cancel this order? This reverses stock and cannot be undone — the customer and vendor will be notified.")) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-2 rounded-control border border-red-200 bg-red-50 p-3">
      <h3 className="text-xs font-semibold text-red-700">Cancel order</h3>
      <input type="hidden" name="orderId" value={orderId} />
      <textarea name="reason" required rows={2} placeholder="Reason for cancellation (required)" className="w-full rounded-control border border-border-brand px-2.5 py-1.5 text-xs" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-control bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Back
        </button>
      </div>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function StartRefundAction({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(requestRefundAction, initialActionState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") return <p className="text-sm text-brand-primary">{state.message}</p>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        Start a refund
      </button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Start a refund request for this order? It will need approval on the Refunds page before money moves.")) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-2 rounded-control border border-border-brand p-3">
      <h3 className="text-xs font-semibold text-brand-dark">Start a refund</h3>
      <input type="hidden" name="orderId" value={orderId} />
      <textarea name="reason" required rows={2} placeholder="Reason for the refund (required)" className="w-full rounded-control border border-border-brand px-2.5 py-1.5 text-xs" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
          {pending ? "Submitting…" : "Submit refund request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Back
        </button>
      </div>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function AssignRiderAction({ orderId, riders, currentRiderId }: { orderId: string; riders: { id: string; name: string; phone: string }[]; currentRiderId: string | null }) {
  const [state, formAction, pending] = useActionState(adminAssignRiderAction, initialActionState);
  const [open, setOpen] = useState(false);
  const label = currentRiderId ? "Change rider" : "Assign rider";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        {label}
      </button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const riderName = riders.find((r) => r.id === fd.get("riderId"))?.name ?? "this rider";
    if (!window.confirm(`Assign ${riderName} to this order?`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-2 rounded-control border border-border-brand p-3">
      <h3 className="text-xs font-semibold text-brand-dark">{label}</h3>
      <input type="hidden" name="orderId" value={orderId} />
      {riders.length === 0 ? (
        <p className="text-xs text-gray-500">No approved riders available.</p>
      ) : (
        <select name="riderId" required defaultValue={currentRiderId ?? ""} className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs">
          <option value="" disabled>
            Choose a rider
          </option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.phone}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || riders.length === 0} className="rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
          {pending ? "Assigning…" : "Confirm"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Back
        </button>
      </div>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function OrderAdminActions({ orderId, canCancel, canRefund, canAssignRider, riders, currentRiderId, contacts }: OrderAdminActionsProps) {
  const hasAnyAction = canCancel || canRefund || canAssignRider;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</h3>
        {hasAnyAction ? (
          <div className="flex flex-wrap gap-2">
            {canAssignRider && <AssignRiderAction orderId={orderId} riders={riders} currentRiderId={currentRiderId} />}
            {canRefund && <StartRefundAction orderId={orderId} />}
            {canCancel && <CancelOrderAction orderId={orderId} />}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No actions available for this order&apos;s current status.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</h3>
        <div className="space-y-2">
          <ContactButtons label="Customer" contact={contacts.customer} />
          <ContactButtons label="Vendor" contact={contacts.vendor} />
          <ContactButtons label="Rider" contact={contacts.rider} />
        </div>
      </div>
    </div>
  );
}
