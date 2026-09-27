"use client";

import { useActionState } from "react";
import Link from "next/link";
import { setRiderApprovalAction, updateRiderOfficeVerificationAction } from "@/lib/actions/admin-riders";
import { initialActionState } from "@/lib/actions/types";
import { Badge } from "@/components/ui/badge";

export type RiderCardData = {
  id: string;
  name: string;
  phone: string;
  vehicleType: string | null;
  createdAt: string;
  hasNationalIdDoc: boolean;
  nationalIdNo: string | null;
  licenseCheckedInOffice: boolean;
  photoCheckedInOffice: boolean;
  licenseNumber: string | null;
  adminNote: string | null;
  isDuplicateNid: boolean;
  isOnline?: boolean;
  deliveryCount?: number;
  balancePoisha?: number;
  todayCollectedPoisha?: number;
};

function formatTk(poisha: number): string {
  return `Tk ${Math.abs(poisha / 100).toFixed(2)}`;
}

export function RiderCard({ rider, mode }: { rider: RiderCardData; mode: "pending" | "approved" }) {
  const [approveState, approveAction, approvePending] = useActionState(setRiderApprovalAction, initialActionState);
  const [officeState, officeAction, officePending] = useActionState(updateRiderOfficeVerificationAction, initialActionState);

  // "Only relevant for motorbike" — matches old free-text values (e.g. seed
  // data's "Motorcycle") as well as the new canonical "MOTORBIKE", so this
  // doesn't need a data migration to work for pre-existing riders.
  const isMotorbike = rider.vehicleType?.toUpperCase().includes("MOTOR") ?? false;

  return (
    <div className="space-y-3 rounded-card border border-border-brand bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-brand-dark">
            {mode === "approved" ? (
              <Link href={`/admin/riders/${rider.id}`} className="hover:underline">
                {rider.name}
              </Link>
            ) : (
              rider.name
            )}
          </p>
          <p className="text-xs text-gray-500">
            {rider.phone} · {rider.vehicleType ?? "No vehicle set"}
            {mode === "approved" && ` · ${rider.deliveryCount ?? 0} deliveries`}
          </p>
          <p className="text-xs text-gray-500">NID: {rider.nationalIdNo ?? "—"}</p>
          {mode === "approved" && rider.balancePoisha != null && (
            <p className="mt-1 text-xs font-semibold text-brand-dark">
              {rider.balancePoisha === 0 ? "All settled" : rider.balancePoisha > 0 ? `Owes platform: ${formatTk(rider.balancePoisha)}` : `Platform owes: ${formatTk(rider.balancePoisha)}`}
              {rider.todayCollectedPoisha ? ` · Collected today: ${formatTk(rider.todayCollectedPoisha)}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {mode === "approved" && <Badge variant={rider.isOnline ? "success" : "outline"}>{rider.isOnline ? "Online" : "Offline"}</Badge>}
          {!rider.hasNationalIdDoc && <Badge variant="warning">NID missing</Badge>}
          {rider.isDuplicateNid && <Badge variant="warning">NID number also used by another rider</Badge>}
        </div>
      </div>

      {rider.hasNationalIdDoc ? (
        <Link
          href={`/admin/riders/${rider.id}/documents/national-id`}
          target="_blank"
          className="inline-block text-xs font-semibold text-brand-primary hover:underline"
        >
          View NID photo
        </Link>
      ) : (
        <p className="text-xs text-gray-400">No NID photo on file.</p>
      )}

      <form action={officeAction} className="space-y-2 rounded-control bg-surface-muted p-3">
        <input type="hidden" name="riderId" value={rider.id} />
        {officeState.status === "error" && <p className="text-xs text-red-600">{officeState.message}</p>}
        <label className="flex items-center gap-2 text-xs text-brand-dark">
          <input type="checkbox" name="photoCheckedInOffice" value="1" defaultChecked={rider.photoCheckedInOffice} />
          Photo taken in office
        </label>
        {isMotorbike && (
          <label className="flex items-center gap-2 text-xs text-brand-dark">
            <input type="checkbox" name="licenseCheckedInOffice" value="1" defaultChecked={rider.licenseCheckedInOffice} />
            Driving licence checked in office
          </label>
        )}
        <input
          name="licenseNumber"
          defaultValue={rider.licenseNumber ?? ""}
          placeholder="Licence number (optional)"
          className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs"
        />
        <textarea
          name="adminNote"
          defaultValue={rider.adminNote ?? ""}
          placeholder="Admin notes"
          rows={2}
          className="w-full rounded-control border border-border-brand px-2.5 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={officePending}
          className="rounded-control border border-border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60"
        >
          Save
        </button>
      </form>

      {approveState.status === "error" && <p className="text-xs text-red-600">{approveState.message}</p>}
      <form action={approveAction}>
        <input type="hidden" name="riderId" value={rider.id} />
        <input type="hidden" name="isApproved" value={mode === "pending" ? "1" : "0"} />
        <button
          type="submit"
          disabled={approvePending}
          className={
            mode === "pending"
              ? "rounded-control bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              : "rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60"
          }
        >
          {mode === "pending" ? "Approve" : "Suspend"}
        </button>
      </form>
    </div>
  );
}
