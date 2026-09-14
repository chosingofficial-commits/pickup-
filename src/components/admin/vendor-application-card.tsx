"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { approveVendorApplicationAction, rejectVendorApplicationAction, requestMoreInfoAction } from "@/lib/actions/admin-vendor-applications";
import { initialActionState } from "@/lib/actions/types";
import { Badge } from "@/components/ui/badge";

export type VendorApplicationRow = {
  id: string;
  businessName: string;
  ownerName: string;
  businessType: "GROCERY_VENDOR" | "RESTAURANT";
  phone: string;
  email: string;
  addressText: string;
  status: string;
  tradeLicenseNo: string;
  tradeLicenseDocUrl: string;
  nationalIdNo: string;
  nationalIdDocUrl: string;
  createdAt: string;
};

export function VendorApplicationCard({ application }: { application: VendorApplicationRow }) {
  const [approveState, approveAction, approvePending] = useActionState(approveVendorApplicationAction, initialActionState);
  const [rejectState, rejectAction] = useActionState(rejectVendorApplicationAction, initialActionState);
  const [infoState, infoAction] = useActionState(requestMoreInfoAction, initialActionState);
  const [showReject, setShowReject] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const done = approveState.status === "success" || rejectState.status === "success" || infoState.status === "success";

  return (
    <div className="rounded-card border border-border-brand bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-brand-dark">{application.businessName}</p>
          <p className="text-xs text-gray-500">
            {application.ownerName} · {application.phone} · {application.email}
          </p>
          <p className="text-xs text-gray-500">{application.addressText}</p>
        </div>
        <Badge variant={application.businessType === "RESTAURANT" ? "dark" : "accent"}>
          {application.businessType === "RESTAURANT" ? "Restaurant" : "Grocery vendor"}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
        <span>Trade licence: {application.tradeLicenseNo}</span>
        <Link href={application.tradeLicenseDocUrl} target="_blank" className="text-brand-primary hover:underline">
          View document
        </Link>
        <span>NID: {application.nationalIdNo}</span>
        <Link href={application.nationalIdDocUrl} target="_blank" className="text-brand-primary hover:underline">
          View document
        </Link>
      </div>

      {done ? (
        <p className="mt-3 text-sm text-brand-primary">
          {approveState.message || rejectState.message || infoState.message}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <form action={approveAction}>
              <input type="hidden" name="applicationId" value={application.id} />
              <button type="submit" disabled={approvePending} className="rounded-control bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
                Approve
              </button>
            </form>
            <button type="button" onClick={() => setShowReject((s) => !s)} className="rounded-control border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
              Reject
            </button>
            <button type="button" onClick={() => setShowInfo((s) => !s)} className="rounded-control border border-border-brand px-4 py-2 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
              Request more info
            </button>
          </div>

          {showReject && (
            <form action={rejectAction} className="flex gap-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <input name="reason" placeholder="Reason for rejection" required className="h-9 flex-1 rounded-control border border-border-brand px-3 text-xs" />
              <button type="submit" className="rounded-control bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">
                Send
              </button>
            </form>
          )}
          {showInfo && (
            <form action={infoAction} className="flex gap-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <input name="note" placeholder="What's missing?" required className="h-9 flex-1 rounded-control border border-border-brand px-3 text-xs" />
              <button type="submit" className="rounded-control bg-brand-dark px-3 text-xs font-semibold text-white hover:opacity-90">
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
