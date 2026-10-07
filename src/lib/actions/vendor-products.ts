"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { productSchema, variantRowsSchema, MAX_PRODUCT_PHOTOS, type VariantRowInput } from "@/lib/validation/product";
import { formatVariantLabel } from "@/lib/catalog/variant-label";
import { syncProductFromVariants } from "@/lib/catalog/variant-sync";
import { slugify } from "@/lib/utils";
import { isTobaccoModuleEnabled } from "@/lib/tobacco/queries";
import { containsBlockedTobaccoProduct } from "@/lib/tobacco/blocklist";
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

// Deliberately NOT sliced to MAX_PRODUCT_PHOTOS here — a product that
// already has more than that (from before the 6->3 cut) must have its
// extras explicitly removed by the vendor, never silently dropped on a
// plain resubmit. Callers check the length themselves and reject instead.
function getImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

// Variant rows arrive as parallel repeated fields (variantQuantityValue,
// variantUnit, ...), the same convention this form already used for
// imageUrls — paired positionally by array index.
function getVariantRows(formData: FormData): unknown[] {
  const ids = formData.getAll("variantId").map(String);
  const quantityValues = formData.getAll("variantQuantityValue").map(String);
  const units = formData.getAll("variantUnit").map(String);
  const packCounts = formData.getAll("variantPackCount").map(String);
  const prices = formData.getAll("variantPrice").map(String);
  const compareAtPrices = formData.getAll("variantCompareAtPrice").map(String);
  const stocks = formData.getAll("variantStock").map(String);

  return quantityValues.map((quantityValue, i) => ({
    id: ids[i] || undefined,
    quantityValue,
    unit: units[i],
    packCount: packCounts[i] || "1",
    price: prices[i],
    compareAtPrice: compareAtPrices[i],
    stock: stocks[i],
  }));
}

function parseVariantRows(formData: FormData): { rows: VariantRowInput[]; defaultIndex: number } | { error: string } {
  const parsed = variantRowsSchema.safeParse(getVariantRows(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the size/option rows." };
  const rows = parsed.data;
  const defaultIndex = Math.min(Math.max(0, Number(formData.get("variantDefaultIndex") ?? 0)), rows.length - 1);
  return { rows, defaultIndex };
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { vendorId } = await requireGroceryVendor();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    sku: formData.get("sku"),
    isWeeklyGrocery: formData.get("isWeeklyGrocery") === "1",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }
  if (containsBlockedTobaccoProduct(parsed.data.name) || containsBlockedTobaccoProduct(parsed.data.description ?? "")) {
    return { status: "error", message: "E-cigarettes, vapes, heated tobacco, and nicotine pouches are never allowed on Pick Up." };
  }

  const restriction = await resolveCategoryRestriction(parsed.data.categoryId);
  if ("error" in restriction) return { status: "error", message: restriction.error };

  const variantsResult = parseVariantRows(formData);
  if ("error" in variantsResult) return { status: "error", message: variantsResult.error };
  const { rows, defaultIndex } = variantsResult;

  // Age-restricted products always show the one standard plain pack image —
  // never whatever the form submitted, even if the vendor's own category
  // check above somehow let a tampered POST through with photos attached.
  const imageUrls = restriction.isAgeRestricted ? [] : getImageUrls(formData);
  if (imageUrls.length > MAX_PRODUCT_PHOTOS) return { status: "error", message: `Up to ${MAX_PRODUCT_PHOTOS} photos only.` };
  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let n = 1;
  while (await db.product.findFirst({ where: { vendorId, slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const cheapest = rows.reduce((min, r) => (r.price < min.price ? r : min));

  const product = await db.product.create({
    data: {
      vendorId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      // Price/compare-at-price/unit are a maintained cache of the cheapest
      // active variant — see syncProductFromVariants for why, and for how
      // this stays in sync after edits.
      price: cheapest.price,
      compareAtPrice: cheapest.compareAtPrice ?? null,
      unit: formatVariantLabel(cheapest, "en"),
      sku: parsed.data.sku || null,
      isAgeRestricted: restriction.isAgeRestricted,
      isWeeklyGrocery: parsed.data.isWeeklyGrocery,
      isPublished: true,
      images: imageUrls.length > 0 ? { create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })) } : undefined,
      inventory: { create: { quantityInStock: rows.reduce((sum, r) => sum + r.stock, 0) } },
      variants: {
        create: rows.map((r, i) => ({
          name: formatVariantLabel(r, "en"),
          quantityValue: r.quantityValue,
          unit: r.unit,
          packCount: r.packCount,
          price: r.price,
          compareAtPrice: r.compareAtPrice ?? null,
          stockQty: r.stock,
          isDefault: i === defaultIndex,
          isActive: true,
          sortOrder: i,
        })),
      },
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
    sku: formData.get("sku"),
    isWeeklyGrocery: formData.get("isWeeklyGrocery") === "1",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }
  if (containsBlockedTobaccoProduct(parsed.data.name) || containsBlockedTobaccoProduct(parsed.data.description ?? "")) {
    return { status: "error", message: "E-cigarettes, vapes, heated tobacco, and nicotine pouches are never allowed on Pick Up." };
  }

  const restriction = await resolveCategoryRestriction(parsed.data.categoryId);
  if ("error" in restriction) return { status: "error", message: restriction.error };

  const variantsResult = parseVariantRows(formData);
  if ("error" in variantsResult) return { status: "error", message: variantsResult.error };
  const { rows, defaultIndex } = variantsResult;

  // Age-restricted products always show the one standard plain pack image —
  // never whatever the form submitted, even if a vendor somehow still had
  // photo slots to submit from before the category was made restricted.
  const imageUrls = restriction.isAgeRestricted ? [] : getImageUrls(formData);
  if (imageUrls.length > MAX_PRODUCT_PHOTOS) {
    return { status: "error", message: `Up to ${MAX_PRODUCT_PHOTOS} photos only — remove ${imageUrls.length - MAX_PRODUCT_PHOTOS} to save.` };
  }

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sku: parsed.data.sku || null,
        isAgeRestricted: restriction.isAgeRestricted,
        isWeeklyGrocery: parsed.data.isWeeklyGrocery,
      },
    });

    // Slots are pre-filled with each image's current URL, so a plain resubmit
    // round-trips the same set unchanged — safe to fully replace here rather
    // than diff against what was there before.
    await tx.productImage.deleteMany({ where: { productId } });
    if (imageUrls.length > 0) {
      await tx.productImage.createMany({ data: imageUrls.map((url, sortOrder) => ({ productId, url, sortOrder })) });
    }

    const submittedIds = new Set(rows.map((r) => r.id).filter((id): id is string => !!id));
    const existingVariants = await tx.productVariant.findMany({ where: { productId } });

    // Deactivate rows the vendor removed — never hard-delete, since past
    // cart/order rows may still reference them; isActive: false is enough
    // to drop it from the customer-facing picker and stock/pricing math.
    const toDeactivate = existingVariants.filter((v) => !submittedIds.has(v.id));
    if (toDeactivate.length > 0) {
      await tx.productVariant.updateMany({
        where: { id: { in: toDeactivate.map((v) => v.id) } },
        data: { isActive: false, isDefault: false },
      });
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const data = {
        name: formatVariantLabel(r, "en"),
        quantityValue: r.quantityValue,
        unit: r.unit,
        packCount: r.packCount,
        price: r.price,
        compareAtPrice: r.compareAtPrice ?? null,
        stockQty: r.stock,
        isDefault: i === defaultIndex,
        isActive: true,
        sortOrder: i,
      };
      if (r.id) {
        await tx.productVariant.update({ where: { id: r.id }, data });
      } else {
        await tx.productVariant.create({ data: { ...data, productId } });
      }
    }

    await syncProductFromVariants(tx, productId);
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
