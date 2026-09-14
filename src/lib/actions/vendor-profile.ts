"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

const businessProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().email(),
  addressText: z.string().trim().min(5),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateVendorProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return { status: "error", message: "Please log in." };

  const parsed = businessProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    addressText: formData.get("addressText"),
    logoUrl: formData.get("logoUrl"),
    coverImageUrl: formData.get("coverImageUrl"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  await db.vendor.update({
    where: { id: user.vendorProfile.id },
    data: {
      businessName: parsed.data.businessName,
      description: parsed.data.description || null,
      phone: parsed.data.phone,
      email: parsed.data.email,
      addressText: parsed.data.addressText,
      logoUrl: parsed.data.logoUrl || undefined,
      coverImageUrl: parsed.data.coverImageUrl || undefined,
    },
  });

  revalidatePath("/vendor/profile");
  return { status: "success", message: "Business profile updated." };
}
