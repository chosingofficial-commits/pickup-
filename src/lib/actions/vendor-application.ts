"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { vendorApplicationSchema } from "@/lib/validation/vendor-application";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

export async function submitVendorApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/register?next=/vendor/register");

  const existingApplication = await db.vendorApplication.findFirst({
    where: { applicantUserId: user.id, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } },
  });
  if (existingApplication) {
    return { status: "error", message: "You already have an application in progress or an approved account." };
  }

  const parsed = vendorApplicationSchema.safeParse({
    businessType: formData.get("businessType"),
    businessName: formData.get("businessName"),
    ownerName: formData.get("ownerName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    addressText: formData.get("addressText"),
    deliveryCoverageText: formData.get("deliveryCoverageText"),
    productCategories: formData.getAll("productCategories"),
    openingHoursText: formData.get("openingHoursText"),
    businessDescription: formData.get("businessDescription"),
    tradeLicenseNo: formData.get("tradeLicenseNo"),
    tradeLicenseDocUrl: formData.get("tradeLicenseDocUrl"),
    nationalIdNo: formData.get("nationalIdNo"),
    nationalIdDocUrl: formData.get("nationalIdDocUrl"),
    bankOrMfsAccount: formData.get("bankOrMfsAccount"),
    logoUrl: formData.get("logoUrl"),
    coverImageUrl: formData.get("coverImageUrl"),
    paymentMethod: formData.get("paymentMethod"),
    paymentReference: formData.get("paymentReference"),
    agreementAccepted: formData.get("agreementAccepted"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const application = await db.vendorApplication.create({
    data: {
      applicantUserId: user.id,
      businessName: parsed.data.businessName,
      ownerName: parsed.data.ownerName,
      businessType: parsed.data.businessType,
      phone: parsed.data.phone,
      email: parsed.data.email,
      addressText: parsed.data.addressText,
      deliveryCoverageText: parsed.data.deliveryCoverageText,
      productCategories: parsed.data.productCategories,
      openingHoursText: parsed.data.openingHoursText || null,
      businessDescription: parsed.data.businessDescription || null,
      tradeLicenseNo: parsed.data.tradeLicenseNo,
      tradeLicenseDocUrl: parsed.data.tradeLicenseDocUrl,
      nationalIdNo: parsed.data.nationalIdNo,
      nationalIdDocUrl: parsed.data.nationalIdDocUrl,
      bankOrMfsAccount: parsed.data.bankOrMfsAccount,
      logoUrl: parsed.data.logoUrl || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference,
      status: "SUBMITTED",
    },
  });

  await recordAuditLog({ actorUserId: user.id, action: "VENDOR_APPLICATION_SUBMITTED", entityType: "VendorApplication", entityId: application.id });

  redirect(`/vendor/register/submitted?applicationId=${application.id}`);
}
