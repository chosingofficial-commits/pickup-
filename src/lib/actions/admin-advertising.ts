"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import path from "node:path";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { bdDateStringToUtcStart, bdDateStringToUtcEnd } from "@/lib/date/bd-time";
import { formatShortBdDate } from "@/lib/ads/availability";
import { getStorageAdapter } from "@/lib/storage/registry";
import type { ActionState } from "./types";

const EXT_BY_CONTENT_TYPE: Record<string, string> = { "image/png": ".png", "image/webp": ".webp", "image/jpeg": ".jpg" };

// Statuses that still occupy a paid/committed slot — CANCELLED and EXPIRED
// free it up, everything else (including PAUSED, which is reversible) does
// not.
const SLOT_OCCUPYING_STATUSES = ["SCHEDULED", "ACTIVE", "PAUSED"] as const;

/**
 * The capacity gate: never lets a NEW or EDITED campaign push a placement's
 * overlapping-campaign count past its admin-set maximum. Never touches
 * campaigns that already exist and aren't being changed — an approved, paid
 * campaign is never hidden or blocked retroactively by this.
 */
async function checkPlacementCapacity(
  placementId: string,
  startDate: Date,
  endDate: Date,
  excludeCampaignId?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const placement = await db.adPlacement.findUnique({ where: { id: placementId } });
  if (!placement) return { ok: false, message: "Placement not found." };

  const overlapping = await db.adCampaign.count({
    where: {
      placementId,
      status: { in: [...SLOT_OCCUPYING_STATUSES] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(excludeCampaignId ? { id: { not: excludeCampaignId } } : {}),
    },
  });

  if (overlapping >= placement.maxConcurrentAds) {
    return { ok: false, message: `${placement.name} is full from ${formatShortBdDate(startDate)} to ${formatShortBdDate(endDate)}.` };
  }
  return { ok: true };
}

export async function approveAdvertisementAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const advertisementId = String(formData.get("advertisementId") ?? "");
  const ad = await db.advertisement.findUnique({ where: { id: advertisementId }, include: { advertiser: true } });
  if (!ad) return;

  // Copy the image out of the private bucket into the public one now that
  // it's been reviewed — it was never publicly reachable before this.
  let bannerImageUrl = ad.bannerImageUrl;
  if (ad.pendingBannerImageKey) {
    const adapter = getStorageAdapter();
    const object = await adapter.getObject(ad.pendingBannerImageKey, { private: true });
    if (object) {
      const ext = path.extname(ad.pendingBannerImageKey) || EXT_BY_CONTENT_TYPE[object.contentType] || ".jpg";
      const result = await adapter.upload({ buffer: object.body, filename: `ad${ext}`, contentType: object.contentType }, "ads", { private: false });
      bannerImageUrl = result.url;
    }
    await adapter.delete(ad.pendingBannerImageKey, { private: true });
  }

  await db.advertisement.update({
    where: { id: advertisementId },
    data: { status: "APPROVED", bannerImageUrl, pendingBannerImageKey: null },
  });
  if (ad.advertiser.userId) {
    await db.notification.create({
      data: {
        userId: ad.advertiser.userId,
        type: "ACCOUNT",
        title: "Your ad was approved",
        body: `"${ad.title}" was approved. We'll set up your campaign and confirm the price next.`,
        linkUrl: "/account/ads",
      },
    });
  }
  await recordAuditLog({ actorUserId: admin.id, action: "ADVERTISEMENT_APPROVED", entityType: "Advertisement", entityId: advertisementId });
  revalidatePath("/admin/advertising/requests");
}

export async function rejectAdvertisementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const advertisementId = String(formData.get("advertisementId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", message: "Provide a rejection reason." };

  const ad = await db.advertisement.findUnique({ where: { id: advertisementId }, include: { advertiser: true } });
  if (!ad) return { status: "error", message: "Advertisement not found." };
  if (ad.pendingBannerImageKey) {
    await getStorageAdapter().delete(ad.pendingBannerImageKey, { private: true });
  }

  await db.advertisement.update({
    where: { id: advertisementId },
    data: { status: "REJECTED", rejectionReason: reason, pendingBannerImageKey: null },
  });
  if (ad.advertiser.userId) {
    await db.notification.create({
      data: {
        userId: ad.advertiser.userId,
        type: "ACCOUNT",
        title: "Your ad was not approved",
        body: `"${ad.title}" was not approved: ${reason}`,
        linkUrl: "/account/ads",
      },
    });
  }
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

  const campaignStartDate = bdDateStringToUtcStart(parsed.data.startDate);
  const campaignEndDate = bdDateStringToUtcEnd(parsed.data.endDate);
  const capacity = await checkPlacementCapacity(parsed.data.placementId, campaignStartDate, campaignEndDate);
  if (!capacity.ok) return { status: "error", message: capacity.message };

  await db.$transaction(async (tx) => {
    const campaign = await tx.adCampaign.create({
      data: {
        advertisementId: parsed.data.advertisementId,
        placementId: parsed.data.placementId,
        startDate: campaignStartDate,
        endDate: campaignEndDate,
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

/** ACTIVE if `now` falls within the campaign's window, otherwise SCHEDULED (future) or EXPIRED (past) — shared by mark-paid and the date-edit action so a campaign's status always matches its actual window. */
function computeWindowStatus(startDate: Date, endDate: Date, now = new Date()): "ACTIVE" | "SCHEDULED" | "EXPIRED" {
  if (now < startDate) return "SCHEDULED";
  if (now > endDate) return "EXPIRED";
  return "ACTIVE";
}

const AD_PAYMENT_METHODS = ["BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "CARD", "COD"] as const;

export async function markAdPaymentPaidAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!AD_PAYMENT_METHODS.includes(method as (typeof AD_PAYMENT_METHODS)[number])) return;

  const payment = await db.adPayment.findUnique({
    where: { id: paymentId },
    include: { campaign: { include: { advertisement: { include: { advertiser: true } } } } },
  });
  if (!payment) return;

  const now = new Date();
  const nextStatus = computeWindowStatus(payment.campaign.startDate, payment.campaign.endDate, now);
  const nextCampaignStatus = nextStatus === "EXPIRED" ? "EXPIRED" : nextStatus;

  await db.$transaction([
    db.adPayment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: now, provider: method as (typeof AD_PAYMENT_METHODS)[number], providerRef: reference || null },
    }),
    db.adCampaign.update({ where: { id: payment.campaignId }, data: { status: nextCampaignStatus } }),
    db.advertisement.update({ where: { id: payment.campaign.advertisementId }, data: { status: nextCampaignStatus } }),
  ]);

  const advertiserUserId = payment.campaign.advertisement.advertiser.userId;
  if (advertiserUserId) {
    await db.notification.create({
      data: {
        userId: advertiserUserId,
        type: "PAYMENT",
        title: "Payment received for your ad",
        body: `We've recorded your payment for "${payment.campaign.advertisement.title}". Your campaign is ${nextCampaignStatus === "ACTIVE" ? "now running" : "scheduled"}.`,
        linkUrl: "/account/ads",
      },
    });
  }

  await recordAuditLog({
    actorUserId: admin.id,
    action: "AD_PAYMENT_MARKED_PAID",
    entityType: "AdPayment",
    entityId: paymentId,
    metadata: { method, reference: reference || undefined },
  });
  revalidatePath("/admin/advertising/requests");
  revalidatePath("/admin/advertising/campaigns");
}

export async function cancelAdCampaignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "");
  const campaign = await db.adCampaign.findUnique({ where: { id: campaignId }, include: { advertisement: { include: { advertiser: true } } } });
  if (!campaign) return;

  await db.$transaction([
    db.adCampaign.update({ where: { id: campaignId }, data: { status: "CANCELLED" } }),
    db.advertisement.update({ where: { id: campaign.advertisementId }, data: { status: "CANCELLED" } }),
  ]);
  const advertiserUserId = campaign.advertisement.advertiser.userId;
  if (advertiserUserId) {
    await db.notification.create({
      data: {
        userId: advertiserUserId,
        type: "PROMOTION",
        title: "Your ad has ended",
        body: `"${campaign.advertisement.title}" was ended and is no longer showing to customers.`,
        linkUrl: "/account/ads",
      },
    });
  }
  await recordAuditLog({ actorUserId: admin.id, action: "AD_CAMPAIGN_CANCELLED", entityType: "AdCampaign", entityId: campaignId });
  revalidatePath("/admin/advertising/requests");
  revalidatePath("/admin/advertising/campaigns");
}

/** Pause a running/scheduled campaign — hides it from the live carousel without cancelling it; resumable anytime. */
export async function pauseAdCampaignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "");
  const campaign = await db.adCampaign.findUnique({ where: { id: campaignId }, include: { advertisement: { include: { advertiser: true } } } });
  if (!campaign || campaign.status === "CANCELLED" || campaign.status === "EXPIRED") return;

  await db.adCampaign.update({ where: { id: campaignId }, data: { status: "PAUSED" } });
  const advertiserUserId = campaign.advertisement.advertiser.userId;
  if (advertiserUserId) {
    await db.notification.create({
      data: {
        userId: advertiserUserId,
        type: "PROMOTION",
        title: "Your ad was paused",
        body: `"${campaign.advertisement.title}" is temporarily paused and isn't showing to customers right now.`,
        linkUrl: "/account/ads",
      },
    });
  }
  await recordAuditLog({ actorUserId: admin.id, action: "AD_CAMPAIGN_PAUSED", entityType: "AdCampaign", entityId: campaignId });
  revalidatePath("/admin/advertising/campaigns");
}

/**
 * Resumes a paused campaign, recomputing ACTIVE/SCHEDULED/EXPIRED from its
 * (possibly since-edited) date window. Silently stays paused if resuming
 * would exceed the placement's capacity (other campaigns may have filled
 * the gap while this one was paused) — this action has no error-message UI,
 * matching pause/cancel/toggle's existing silent-reject convention; the
 * admin can just try Edit dates instead, which does surface a message.
 */
export async function resumeAdCampaignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const campaignId = String(formData.get("campaignId") ?? "");
  const campaign = await db.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "PAUSED") return;

  const capacity = await checkPlacementCapacity(campaign.placementId, campaign.startDate, campaign.endDate, campaign.id);
  if (!capacity.ok) return;

  const nextStatus = computeWindowStatus(campaign.startDate, campaign.endDate);
  await db.adCampaign.update({ where: { id: campaignId }, data: { status: nextStatus } });
  await recordAuditLog({ actorUserId: admin.id, action: "AD_CAMPAIGN_RESUMED", entityType: "AdCampaign", entityId: campaignId });
  revalidatePath("/admin/advertising/campaigns");
}

const updateDatesSchema = z
  .object({
    campaignId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .refine((d) => d.endDate > d.startDate, { message: "End date must be after start date" });

export async function updateAdCampaignDatesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = updateDatesSchema.safeParse({
    campaignId: formData.get("campaignId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Fill in both dates." };

  const campaign = await db.adCampaign.findUnique({ where: { id: parsed.data.campaignId } });
  if (!campaign || campaign.status === "CANCELLED") return { status: "error", message: "Campaign not found or cancelled." };

  const startDate = bdDateStringToUtcStart(parsed.data.startDate);
  const endDate = bdDateStringToUtcEnd(parsed.data.endDate);

  const capacity = await checkPlacementCapacity(campaign.placementId, startDate, endDate, campaign.id);
  if (!capacity.ok) return { status: "error", message: capacity.message };

  // Only recompute the live status for a campaign that isn't deliberately
  // paused — editing dates on a paused campaign shouldn't silently resume it.
  const nextStatus = campaign.status === "PAUSED" ? "PAUSED" : computeWindowStatus(startDate, endDate);

  await db.adCampaign.update({ where: { id: campaign.id }, data: { startDate, endDate, status: nextStatus } });
  await recordAuditLog({ actorUserId: admin.id, action: "AD_CAMPAIGN_DATES_UPDATED", entityType: "AdCampaign", entityId: campaign.id, metadata: { startDate, endDate } });
  revalidatePath("/admin/advertising/campaigns");
  return { status: "success", message: "Dates updated." };
}

export async function updateAdPricingAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const pricingId = String(formData.get("pricingId") ?? "");
  const price = Number(formData.get("price"));
  if (!pricingId || !Number.isInteger(price) || price < 0) return;

  await db.adPricing.update({ where: { id: pricingId }, data: { price } });
  await recordAuditLog({ actorUserId: admin.id, action: "AD_PRICING_UPDATED", entityType: "AdPricing", entityId: pricingId, metadata: { price } });
  revalidatePath("/admin/advertising/placements");
  revalidatePath("/advertise");
}

export async function updateAdPlacementMaxAdsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const placementId = String(formData.get("placementId") ?? "");
  const maxConcurrentAds = Number(formData.get("maxConcurrentAds"));
  if (!placementId || !Number.isInteger(maxConcurrentAds) || maxConcurrentAds < 1) return;

  await db.adPlacement.update({ where: { id: placementId }, data: { maxConcurrentAds } });
  await recordAuditLog({ actorUserId: admin.id, action: "AD_PLACEMENT_MAX_ADS_UPDATED", entityType: "AdPlacement", entityId: placementId, metadata: { maxConcurrentAds } });
  revalidatePath("/admin/advertising/placements");
  revalidatePath("/advertise");
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
