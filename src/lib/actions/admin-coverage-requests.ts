"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function updateCoverageRequestStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["PENDING", "PLANNED", "ACTIVATED", "DECLINED"].includes(status)) return;

  await db.coverageRequest.update({ where: { id: requestId }, data: { status: status as never } });
  await recordAuditLog({ actorUserId: admin.id, action: "COVERAGE_REQUEST_UPDATED", entityType: "CoverageRequest", entityId: requestId, metadata: { status } });
  revalidatePath("/admin/coverage-requests");
}
