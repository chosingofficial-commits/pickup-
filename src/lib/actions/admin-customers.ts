"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function toggleCustomerActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CUSTOMER") return;

  await db.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: user.isActive ? "CUSTOMER_DEACTIVATED" : "CUSTOMER_REACTIVATED", entityType: "User", entityId: userId });
  revalidatePath("/admin/customers");
}
