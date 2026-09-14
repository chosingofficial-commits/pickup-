"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function replyToTicketAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;

  await db.supportTicketMessage.create({ data: { ticketId, authorId: admin.id, message } });
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS" } });
  await recordAuditLog({ actorUserId: admin.id, action: "SUPPORT_TICKET_REPLIED", entityType: "SupportTicket", entityId: ticketId });
  revalidatePath("/admin/support");
}

export async function setTicketStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) return;

  await db.supportTicket.update({ where: { id: ticketId }, data: { status: status as never } });
  await recordAuditLog({ actorUserId: admin.id, action: "SUPPORT_TICKET_STATUS_CHANGED", entityType: "SupportTicket", entityId: ticketId, metadata: { status } });
  revalidatePath("/admin/support");
}
