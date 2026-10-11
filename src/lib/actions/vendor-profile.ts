"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { optionalText } from "@/lib/validation/form-helpers";
import { SHOP_TYPES } from "@/lib/shops/shop-type";
import type { ActionState } from "./types";

const businessProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  description: optionalText(z.string().trim().max(1000)),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().email(),
  addressText: z.string().trim().min(5),
  // Only meaningful for GROCERY_VENDOR — ignored for restaurants (see
  // ShopType's schema doc comment). "" (the form's "Not set" option) means
  // "clear it" -> undefined below -> null in the db.vendor.update data.
  shopType: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(SHOP_TYPES).optional()),
  logoUrl: optionalText(z.string().url()),
  coverImageUrl: optionalText(z.string().url()),
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
    shopType: formData.get("shopType"),
    logoUrl: formData.get("logoUrl"),
    coverImageUrl: formData.get("coverImageUrl"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  try {
    await db.vendor.update({
      where: { id: user.vendorProfile.id },
      data: {
        businessName: parsed.data.businessName,
        description: parsed.data.description || null,
        phone: parsed.data.phone,
        email: parsed.data.email,
        addressText: parsed.data.addressText,
        shopType: parsed.data.shopType ?? null,
        logoUrl: parsed.data.logoUrl || undefined,
        coverImageUrl: parsed.data.coverImageUrl || undefined,
      },
    });
  } catch {
    return { status: "error", message: "Couldn't save changes. Please try again." };
  }

  revalidatePath("/vendor/profile");
  return { status: "success", message: "Business profile updated." };
}
