"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import type { ActionState } from "./types";

export async function approveVendorApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") ?? "");

  const application = await db.vendorApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { status: "error", message: "Application not found." };
  if (application.status === "APPROVED") return { status: "error", message: "Already approved." };
  if (!application.applicantUserId) return { status: "error", message: "This application has no linked account." };

  const settings = await getSiteSettings();
  const defaultCommission = Number(settings[SITE_SETTING_KEYS.defaultCommissionRatePct]);

  const baseSlug = slugify(application.businessName);
  let slug = baseSlug;
  let n = 1;
  while (await db.vendor.findUnique({ where: { slug } })) slug = `${baseSlug}-${++n}`;

  await db.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        userId: application.applicantUserId!,
        applicationId: application.id,
        businessName: application.businessName,
        slug,
        businessType: application.businessType,
        logoUrl: application.logoUrl,
        coverImageUrl: application.coverImageUrl,
        description: application.businessDescription,
        phone: application.phone,
        email: application.email,
        addressText: application.addressText,
        commissionRatePct: defaultCommission,
        isApproved: true,
      },
    });

    if (application.businessType === "RESTAURANT") {
      const restaurant = await tx.restaurant.create({
        data: {
          vendorId: vendor.id,
          cuisineTags: application.productCategories,
          preparationTimeMinutes: 20,
          scheduledOrderingEnabled: false,
        },
      });

      // Use the hours the applicant actually set in the structured picker —
      // falling back to the old hard-coded default only for applications
      // submitted before that picker existed (which only have the old
      // free-text openingHoursText, never parsed into anything usable here).
      const submittedHours = Array.isArray(application.weeklyHoursJson)
        ? (application.weeklyHoursJson as unknown as { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean }[])
        : null;

      for (let day = 0; day < 7; day++) {
        const submitted = submittedHours?.find((h) => h.dayOfWeek === day);
        await tx.restaurantWeeklyHours.create({
          data: {
            restaurantId: restaurant.id,
            dayOfWeek: day,
            opensAt: submitted?.opensAt ?? "10:00",
            closesAt: submitted?.closesAt ?? "22:00",
            isClosed: submitted?.isClosed ?? false,
          },
        });
      }
    }

    await tx.user.update({ where: { id: application.applicantUserId! }, data: { role: "VENDOR" } });
    await tx.vendorApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", reviewedByUserId: admin.id, reviewedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: application.applicantUserId!,
        type: "ACCOUNT",
        title: "Your vendor application was approved!",
        body: `${application.businessName} is now live on Pick Up. Log in to your vendor dashboard to get started.`,
        linkUrl: "/vendor",
      },
    });
  });

  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_APPLICATION_APPROVED", entityType: "VendorApplication", entityId: application.id });
  revalidatePath("/admin/vendor-applications");
  return { status: "success", message: "Application approved." };
}

export async function rejectVendorApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", message: "Provide a rejection reason." };

  const application = await db.vendorApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { status: "error", message: "Application not found." };

  await db.vendorApplication.update({
    where: { id: applicationId },
    data: { status: "REJECTED", adminNote: reason, reviewedByUserId: admin.id, reviewedAt: new Date() },
  });

  if (application.applicantUserId) {
    await db.notification.create({
      data: {
        userId: application.applicantUserId,
        type: "ACCOUNT",
        title: "Your vendor application was not approved",
        body: reason,
      },
    });
  }

  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_APPLICATION_REJECTED", entityType: "VendorApplication", entityId: applicationId, metadata: { reason } });
  revalidatePath("/admin/vendor-applications");
  return { status: "success", message: "Application rejected." };
}

export async function requestMoreInfoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const applicationId = String(formData.get("applicationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { status: "error", message: "Enter what information is needed." };

  const application = await db.vendorApplication.update({
    where: { id: applicationId },
    data: { status: "UNDER_REVIEW", adminNote: note, reviewedByUserId: admin.id, reviewedAt: new Date() },
  });

  if (application.applicantUserId) {
    await db.notification.create({
      data: {
        userId: application.applicantUserId,
        type: "ACCOUNT",
        title: "More information needed for your vendor application",
        body: note,
      },
    });
  }

  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_APPLICATION_INFO_REQUESTED", entityType: "VendorApplication", entityId: applicationId });
  revalidatePath("/admin/vendor-applications");
  return { status: "success", message: "Request sent to the applicant." };
}
