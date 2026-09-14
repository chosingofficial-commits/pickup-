"use client";

import { useRef } from "react";
import { updateCoverageRequestStatusAction } from "@/lib/actions/admin-coverage-requests";

const STATUSES = ["PENDING", "PLANNED", "ACTIVATED", "DECLINED"] as const;

export function CoverageRequestStatusSelect({ requestId, status }: { requestId: string; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateCoverageRequestStatusAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 rounded-control border border-border-brand px-2 text-xs"
        aria-label="Coverage request status"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
  );
}
