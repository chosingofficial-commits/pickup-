"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { advertisementRequestSchema } from "@/lib/validation/advertisement";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

export async function submitAdvertisementRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = advertisementRequestSchema.safeParse({
    advertiserName: formData.get("advertiserName"),
    businessName: formData.get("businessName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    title: formData.get("title"),
    description: formData.get("description"),
    targetUrl: formData.get("targetUrl"),
    preferredPlacementCode: formData.get("preferredPlacementCode"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    bannerImageUrl: formData.get("bannerImageUrl"),
    budget: formData.get("budget"),
    paymentMethod: formData.get("paymentMethod"),
    agreementAccepted: formData.get("agreementAccepted"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors };
  }

  const user = await getCurrentUser();

  const advertiserData = {
    advertiserName: parsed.data.advertiserName,
    businessName: parsed.data.businessName,
    phone: parsed.data.phone,
    email: parsed.data.email,
  };

  const advertiser = user
    ? await db.advertiser.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...advertiserData },
        update: advertiserData,
      })
    : await db.advertiser.create({ data: advertiserData });

  const advertisement = await db.advertisement.create({
    data: {
      advertiserId: advertiser.id,
      title: parsed.data.title,
      description: parsed.data.description,
      targetUrl: parsed.data.targetUrl,
      bannerImageUrl: parsed.data.bannerImageUrl,
      preferredPlacementCode: parsed.data.preferredPlacementCode,
      budget: parsed.data.budget,
      paymentMethod: parsed.data.paymentMethod,
      agreementAccepted: true,
      status: "SUBMITTED",
    },
  });

  await recordAuditLog({ actorUserId: user?.id, action: "ADVERTISEMENT_SUBMITTED", entityType: "Advertisement", entityId: advertisement.id });
  redirect(`/advertise/submitted`);
}
