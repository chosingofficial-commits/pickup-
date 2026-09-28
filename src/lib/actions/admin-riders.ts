"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { toPoisha } from "@/lib/rider/ledger";
import type { ActionState } from "./types";

/**
 * Records one manual ledger entry, guarded by a client-generated idempotency
 * key so a duplicate form submission (double-click, resubmit-on-error) is
 * caught here rather than double-recorded. The unique constraint on
 * idempotencyKey is the real guarantee; the pre-check is a fast path that
 * also lets us return a friendly "already recorded" message instead of a raw
 * constraint-violation error.
 */
async function recordManualLedgerEntry(params: {
  adminId: string;
  riderId: string;
  type: "CASH_HANDOVER" | "PAYOUT" | "ADJUSTMENT";
  balanceImpactPoisha: number;
  amountPoisha: number;
  idempotencyKey: string;
  payoutMethod?: string;
  referenceNo?: string;
  note?: string;
}): Promise<ActionState> {
  const existing = await db.riderLedgerEntry.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
  if (existing) return { status: "success", message: "Already recorded." };

  try {
    await db.$transaction(async (tx) => {
      await tx.riderLedgerEntry.create({
        data: {
          riderId: params.riderId,
          type: params.type,
          balanceImpactPoisha: params.balanceImpactPoisha,
          amountPoisha: params.amountPoisha,
          payoutMethod: params.payoutMethod || null,
          referenceNo: params.referenceNo || null,
          note: params.note || null,
          idempotencyKey: params.idempotencyKey,
          createdByUserId: params.adminId,
        },
      });
      await tx.riderProfile.update({ where: { id: params.riderId }, data: { balancePoisha: { increment: params.balanceImpactPoisha } } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "success", message: "Already recorded." };
    }
    throw err;
  }

  await recordAuditLog({ actorUserId: params.adminId, action: `RIDER_LEDGER_${params.type}`, entityType: "RiderProfile", entityId: params.riderId, metadata: { amountPoisha: params.amountPoisha } });
  revalidatePath("/admin/riders");
  revalidatePath(`/admin/riders/${params.riderId}`);
  return { status: "success", message: "Saved." };
}

export async function setRiderApprovalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const isApproved = formData.get("isApproved") === "1";

  const rider = await db.riderProfile.findUnique({ where: { id: riderId } });
  if (!rider) return { status: "error", message: "Rider not found." };

  if (isApproved && !rider.nationalIdDocKey) {
    return { status: "error", message: "Cannot approve — this rider has no National ID photo on file." };
  }

  await db.riderProfile.update({ where: { id: riderId }, data: { isApproved } });
  await db.notification.create({
    data: {
      userId: rider.userId,
      type: "ACCOUNT",
      title: isApproved ? "You're approved to ride with Pick Up!" : "Your rider account was suspended",
      body: isApproved ? "You can now accept deliveries." : "Contact support for details.",
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: isApproved ? "RIDER_APPROVED" : "RIDER_SUSPENDED", entityType: "RiderProfile", entityId: riderId });
  revalidatePath("/admin/riders");
  revalidatePath("/admin/rider-applications");
  return { status: "success", message: isApproved ? "Rider approved." : "Rider suspended." };
}

export async function updateRiderOfficeVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");

  const rider = await db.riderProfile.findUnique({ where: { id: riderId } });
  if (!rider) return { status: "error", message: "Rider not found." };

  const licenseCheckedInOffice = formData.get("licenseCheckedInOffice") === "1";
  const photoCheckedInOffice = formData.get("photoCheckedInOffice") === "1";
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  await db.riderProfile.update({
    where: { id: riderId },
    data: {
      licenseCheckedInOffice,
      photoCheckedInOffice,
      licenseNumber: licenseNumber || null,
      adminNote: adminNote || null,
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: "RIDER_OFFICE_VERIFICATION_UPDATED", entityType: "RiderProfile", entityId: riderId });
  revalidatePath("/admin/riders");
  revalidatePath("/admin/rider-applications");
  return { status: "success", message: "Saved." };
}

/**
 * Cash the rider hands over reduces what they owe the platform.
 * payoutMethod/referenceNo are optional — the plain handover form on the
 * rider detail page omits them, while the admin-list "Mark as paid" quick
 * action (which owes vs. owes-you follow the same balance-settling shape)
 * fills them in to record how the money actually came in.
 */
export async function recordRiderHandoverAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const payoutMethod = String(formData.get("payoutMethod") ?? "");
  const referenceNo = String(formData.get("referenceNo") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!riderId || !idempotencyKey) return { status: "error", message: "Invalid request." };
  if (!Number.isFinite(amount) || amount <= 0) return { status: "error", message: "Enter a valid amount." };

  const amountPoisha = toPoisha(amount);
  return recordManualLedgerEntry({ adminId: admin.id, riderId, type: "CASH_HANDOVER", balanceImpactPoisha: -amountPoisha, amountPoisha, idempotencyKey, payoutMethod, referenceNo, note });
}

/** A payout to the rider reduces what the platform owes them (or increases what they owe, if their balance was already positive). */
export async function recordRiderPayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const payoutMethod = String(formData.get("payoutMethod") ?? "");
  const referenceNo = String(formData.get("referenceNo") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!riderId || !idempotencyKey) return { status: "error", message: "Invalid request." };
  if (!Number.isFinite(amount) || amount <= 0) return { status: "error", message: "Enter a valid amount." };
  if (!payoutMethod) return { status: "error", message: "Choose a payout method." };

  const amountPoisha = toPoisha(amount);
  return recordManualLedgerEntry({ adminId: admin.id, riderId, type: "PAYOUT", balanceImpactPoisha: amountPoisha, amountPoisha, idempotencyKey, payoutMethod, referenceNo, note });
}

/** A manual correction. The admin picks the direction explicitly — a note is required so every adjustment is explained in the ledger. */
export async function recordRiderAdjustmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!riderId || !idempotencyKey) return { status: "error", message: "Invalid request." };
  if (!Number.isFinite(amount) || amount <= 0) return { status: "error", message: "Enter a valid amount." };
  if (direction !== "increase" && direction !== "decrease") return { status: "error", message: "Choose a direction." };
  if (!note) return { status: "error", message: "Explain the reason for this adjustment." };

  const amountPoisha = toPoisha(amount);
  const balanceImpactPoisha = direction === "increase" ? amountPoisha : -amountPoisha;
  return recordManualLedgerEntry({ adminId: admin.id, riderId, type: "ADJUSTMENT", balanceImpactPoisha, amountPoisha, idempotencyKey, note });
}

export async function setRiderCommissionRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const ratePct = Number(formData.get("commissionRatePct") ?? "");
  if (!riderId) return { status: "error", message: "Rider not found." };
  if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 100) return { status: "error", message: "Enter a rate between 0 and 100." };

  await db.riderProfile.update({ where: { id: riderId }, data: { commissionRatePct: ratePct } });
  await recordAuditLog({ actorUserId: admin.id, action: "RIDER_COMMISSION_RATE_CHANGED", entityType: "RiderProfile", entityId: riderId, metadata: { ratePct } });
  revalidatePath("/admin/riders");
  revalidatePath(`/admin/riders/${riderId}`);
  return { status: "success", message: "Rate updated." };
}
