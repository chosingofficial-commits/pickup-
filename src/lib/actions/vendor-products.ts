"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { productSchema, MAX_PRODUCT_PHOTOS } from "@/lib/validation/product";
import { slugify } from "@/lib/utils";
import { isTobaccoModuleEnabled } from "@/lib/tobacco/queries";
import type { ActionState } from "./types";
import type { ProductAvailability } from "@/generated/prisma/client";

/**
 * Products always inherit isAgeRestricted from their category — never left
 * to the vendor's word. Also blocks assignment into a restricted category
 * while the tobacco module is off, so nothing is ever created age-restricted
 * "in name only" and then set live once the module is later enabled.
 */
async function resolveCategoryRestriction(categoryId: string): Promise<{ isAgeRestricted: boolean } | { error: string }> {
  const category = await db.category.findUnique({ where: { id: categoryId }, select: { isAgeRestricted: true } });
  if (!category) return { error: "Choose a valid category." };
  if (category.isAgeRestricted && !(await isTobaccoModuleEnabled())) {
    return { error: "This category is age-restricted and not yet enabled for sale. Contact admin." };
  }
  return { isAgeRestricted: category.isAgeRestricted };
}

async function requireGroceryVendor() {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR" || !user.vendorProfile) redirect("/login?next=/vendor/products");
  if (user.vendorProfile.businessType !== "GROCERY_VENDOR") redirect("/vendor");
  return { user, vendorId: user.vendorProfile.id };
}

// The form only ever renders MAX_PRODUCT_PHOTOS upload slots, but this is a
// server action — cap it here too in case of a tampered/direct POST.
function getImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_PHOTOS);
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { vendorId } = await requireGroceryVendor();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    unit: formData.get("unit"),
    sku: formData.get("sku"),
    quantityInStock: formData.get("quantityInStock"),
    isWeeklyGrocery: formData.get("isWeeklyGrocery") === "1",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const restriction = await resolveCategoryRestriction(parsed.data.categoryId);
  if ("error" in restriction) return { status: "error", message: restriction.error };

  const imageUrls = getImageUrls(formData);
  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let n = 1;
  while (await db.product.findFirst({ where: { vendorId, slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const product = await db.product.create({
    data: {
      vendorId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice,
      unit: parsed.data.unit,
      sku: parsed.data.sku || null,
      isAgeRestricted: restriction.isAgeRestricted,
      isWeeklyGrocery: parsed.data.isWeeklyGrocery,
      isPublished: true,
      images: imageUrls.length > 0 ? { create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })) } : undefined,
      inventory: { create: { quantityInStock: parsed.data.quantityInStock } },
    },
  });

  revalidatePath("/vendor/products");
  revalidateTag("products", "minutes");
  redirect(`/vendor/products?created=${product.id}`);
}

export async function updateProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { vendorId } = await requireGroceryVendor();
  const productId = String(formData.get("productId") ?? "");

  const existing = await db.product.findUnique({ where: { id: productId } });
  if (!existing || existing.vendorId !== vendorId) return { status: "error", message: "Product not found." };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    unit: formData.get("unit"),
    sku: formData.get("sku"),
    quantityInStock: formData.get("quantityInStock"),
    isWeeklyGrocery: formData.get("isWeeklyGrocery") === "1",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const restriction = await resolveCategoryRestriction(parsed.data.categoryId);
  if ("error" in restriction) return { status: "error", message: restriction.error };

  const imageUrls = getImageUrls(formData);

  await db.product.update({
    where: { id: productId },
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
      unit: parsed.data.unit,
      sku: parsed.data.sku || null,
      isAgeRestricted: restriction.isAgeRestricted,
      isWeeklyGrocery: parsed.data.isWeeklyGrocery,
    },
  });

  // Slots are pre-filled with each image's current URL, so a plain resubmit
  // round-trips the same set unchanged — safe to fully replace here rather
  // than diff against what was there before.
  await db.productImage.deleteMany({ where: { productId } });
  if (imageUrls.length > 0) {
    await db.productImage.createMany({ data: imageUrls.map((url, sortOrder) => ({ productId, url, sortOrder })) });
  }

  await db.inventory.upsert({
    where: { productId },
    create: { productId, quantityInStock: parsed.data.quantityInStock },
    update: { quantityInStock: parsed.data.quantityInStock },
  });

  revalidatePath("/vendor/products");
  revalidateTag("products", "minutes");
  return { status: "success", message: "Product updated." };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { vendorId } = await requireGroceryVendor();
  const productId = String(formData.get("productId") ?? "");
  const product = await db.product.findUnique({ where: { id: productId } });
  if (product && product.vendorId === vendorId) {
    await db.product.update({ where: { id: productId }, data: { deletedAt: new Date(), isPublished: false } });
    revalidateTag("products", "minutes");
  }
  revalidatePath("/vendor/products");
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const { vendorId } = await requireGroceryVendor();
  const productId = String(formData.get("productId") ?? "");
  const product = await db.product.findUnique({ where: { id: productId } });
  if (product && product.vendorId === vendorId) {
    await db.product.update({ where: { id: productId }, data: { isPublished: !product.isPublished } });
    revalidateTag("products", "minutes");
  }
  revalidatePath("/vendor/products");
}

export async function setAvailabilityAction(formData: FormData): Promise<void> {
  const { vendorId } = await requireGroceryVendor();
  const productId = String(formData.get("productId") ?? "");
  const availability = String(formData.get("availability") ?? "AVAILABLE") as ProductAvailability;
  const product = await db.product.findUnique({ where: { id: productId } });
  if (product && product.vendorId === vendorId) {
    await db.product.update({ where: { id: productId }, data: { availability } });
  }
  revalidatePath("/vendor/products");
}
