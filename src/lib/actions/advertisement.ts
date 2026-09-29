"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { advertisementRequestSchema } from "@/lib/validation/advertisement";
import { advertiseRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";
import { bdDateStringToUtcStart, bdDateStringToUtcEnd, bdDateRangeDays } from "@/lib/date/bd-time";
import { recordAuditLog } from "@/lib/audit";
import type { AdPlacementCode } from "@/generated/prisma/client";
import type { ActionState } from "./types";

export async function submitAdvertisementRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const allowed = await advertiseRateLimiter.consume(ip);
  if (!allowed) return { status: "error", message: "Too many requests. Please try again later." };

  const parsed = advertisementRequestSchema.safeParse({
    businessName: formData.get("businessName"),
    phone: formData.get("phone"),
    targetUrl: formData.get("targetUrl"),
    bannerImageUrl: formData.get("bannerImageUrl"),
    placementCode: formData.get("placementCode"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    agreementAccepted: formData.get("agreementAccepted"),
    ownsContent: formData.get("ownsContent"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors };
  }

  // The placement dropdown is built from active placements at render time,
  // but re-check here — a placement could have been deactivated between
  // page load and submit, or the field could be tampered with directly.
  const placement = await db.adPlacement.findFirst({ where: { code: parsed.data.placementCode as AdPlacementCode, isActive: true } });
  if (!placement) return { status: "error", message: "That placement is no longer available. Please refresh and try again." };

  const days = bdDateRangeDays(parsed.data.startDate, parsed.data.endDate);
  const dailyPricing = await db.adPricing.findUnique({ where: { placementId_billingCycle: { placementId: placement.id, billingCycle: "DAILY" } } });
  const estimatedBudget = dailyPricing ? Number(dailyPricing.price) * days : 0;

  const user = await getCurrentUser();

  const advertiserData = { advertiserName: parsed.data.businessName, businessName: parsed.data.businessName, phone: parsed.data.phone };
  const advertiser = user
    ? await db.advertiser.upsert({ where: { userId: user.id }, create: { userId: user.id, ...advertiserData }, update: advertiserData })
    : await db.advertiser.create({ data: advertiserData });

  const advertisement = await db.advertisement.create({
    data: {
      advertiserId: advertiser.id,
      title: parsed.data.businessName,
      description: `Advertisement for ${parsed.data.businessName}, requested for ${placement.name} (${days} day${days === 1 ? "" : "s"}, ${parsed.data.startDate} to ${parsed.data.endDate}).`,
      targetUrl: parsed.data.targetUrl,
      bannerImageUrl: parsed.data.bannerImageUrl,
      preferredPlacementCode: parsed.data.placementCode as AdPlacementCode,
      budget: estimatedBudget,
      paymentMethod: "COD", // Actual method is arranged after approval — see the admin-configured payment instructions on /advertise/submitted.
      agreementAccepted: true,
      status: "SUBMITTED",
    },
  });

  // Stash the requested window as an audit metadata note — the real
  // AdCampaign (with its actual dates) is only created once an admin
  // approves and sets it up, but we keep the advertiser's request on record.
  await recordAuditLog({
    actorUserId: user?.id,
    action: "ADVERTISEMENT_SUBMITTED",
    entityType: "Advertisement",
    entityId: advertisement.id,
    metadata: {
      requestedStartDate: bdDateStringToUtcStart(parsed.data.startDate).toISOString(),
      requestedEndDate: bdDateStringToUtcEnd(parsed.data.endDate).toISOString(),
      requestedDays: days,
      estimatedBudget,
    },
  });
  redirect(`/advertise/submitted`);
}
