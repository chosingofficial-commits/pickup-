"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

export async function approveAdvertisementAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const advertisementId = String(formData.get("advertisementId") ?? "");
  await db.advertisement.update({ where: { id: advertisementId }, data: { status: "APPROVED" } });
  await recordAuditLog({ actorUserId: admin.id, action: "ADVERTISEMENT_APPROVED", entityType: "Advertisement", entityId: advertisementId });
  revalidatePath("/admin/advertising/requests");
}

export async function rejectAdvertisementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const advertisementId = String(formData.get("advertisementId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", message: "Provide a rejection reason." };

  await db.advertisement.update({ where: { id: advertisementId }, data: { status: "REJECTED", rejectionReason: reason } });
  await recordAuditLog({ actorUserId: admin.id, action: "ADVERTISEMENT_REJECTED", entityType: "Advertisement", entityId: advertisementId, metadata: { reason } });
  revalidatePath("/admin/advertising/requests");
  return { status: "success", message: "Advertisement rejected." };
}

const campaignSchema = z.object({
  advertisementId: z.string().min(1),
  placementId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  amount: z.coerce.number().min(0),
});

export async function createAdCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = campaignSchema.safeParse({
    advertisementId: formData.get("advertisementId"),
    placementId: formData.get("placementId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { status: "error", message: "Fill in all campaign fields." };

  const advertisement = await db.advertisement.findUnique({ where: { id: parsed.data.advertisementId } });
  if (!advertisement || advertisement.status !== "APPROVED") return { status: "error", message: "Approve the advertisement first." };

  await db.$transaction(async (tx) => {
    const campaign = await tx.adCampaign.create({
      data: {
        advertisementId: parsed.data.advertisementId,
        placementId: parsed.data.placementId,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        status: "SCHEDULED",
      },
    });
    await tx.adPayment.create({
      data: {
        campaignId: campaign.id,
        amount: parsed.data.amount,
        provider: advertisement.paymentMethod,
        status: "PENDING",
        isSandbox: true,
      },
    });
    await tx.advertisement.update({ where: { id: advertisement.id }, data: { status: "PAYMENT_PENDING" } });
  });

  await recordAuditLog({ actorUserId: admin.id, action: "AD_CAMPAIGN_CREATED", entityType: "Advertisement", entityId: advertisement.id });
  revalidatePath("/admin/advertising/requests");
  revalidatePath("/admin/advertising/campaigns");
  return { status: "success", message: "Campaign created — awaiting payment confirmation." };
}

export async function markAdPaymentPaidAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");

  const payment = await db.adPayment.findUnique({ where: { id: paymentId }, include: { campaign: { include: { advertisement: true } } } });
  if (!payment) return;

  const now = new Date();
  const nextCampaignStatus = now >= payment.campaign.startDate && now <= payment.campaign.endDate ? "ACTIVE" : "SCHEDULED";

  await db.$transaction([
    db.adPayment.update({ where: { id: paymentId }, data: { status: "PAID", paidAt: now } }),
    db.adCampaign.update({ where: { id: payment.campaignId }, data: { status: nextCampaignStatus } }),
    db.advertisement.update({ where: { id: payment.campaign.advertisementId }, data: { status: nextCampaignStatus } }),
  ]);

  await recordAuditLog({ actorUserId: admin.id, action: "AD_PAYMENT_MARKED_PAID", entityType: "AdPayment", entityId: paymentId });
  revalidatePath("/admin/advertising/requests");
  revalidatePath("/admin/advertising/campaigns");
}

export async function cancelAdCampaignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "");
  const campaign = await db.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;

  await db.$transaction([
    db.adCampaign.update({ where: { id: campaignId }, data: { status: "CANCELLED" } }),
    db.advertisement.update({ where: { id: campaign.advertisementId }, data: { status: "CANCELLED" } }),
  ]);
  await recordAuditLog({ actorUserId: admin.id, action: "AD_CAMPAIGN_CANCELLED", entityType: "AdCampaign", entityId: campaignId });
  revalidatePath("/admin/advertising/requests");
  revalidatePath("/admin/advertising/campaigns");
}

export async function updateAdPricingAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pricingId = String(formData.get("pricingId") ?? "");
  const price = Number(formData.get("price"));
  if (!pricingId || !Number.isFinite(price)) return;

  await db.adPricing.update({ where: { id: pricingId }, data: { price } });
  await recordAuditLog({ actorUserId: admin.id, action: "AD_PRICING_UPDATED", entityType: "AdPricing", entityId: pricingId, metadata: { price } });
  revalidatePath("/admin/advertising/placements");
}

export async function toggleAdPlacementActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const placementId = String(formData.get("placementId") ?? "");
  const placement = await db.adPlacement.findUnique({ where: { id: placementId } });
  if (!placement) return;

  await db.adPlacement.update({ where: { id: placementId }, data: { isActive: !placement.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: placement.isActive ? "AD_PLACEMENT_DISABLED" : "AD_PLACEMENT_ENABLED", entityType: "AdPlacement", entityId: placementId });
  revalidatePath("/admin/advertising/placements");
}
