"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

async function requireCartId(nextPath: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const cart = await db.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  return cart.id;
}

/**
 * Resolves and validates which variant an add-to-cart/buy-now should use —
 * the one explicitly picked (must belong to this product and be in stock),
 * or the product's default variant when none was picked (every product has
 * one since the variants backfill, so this never falls through to "no
 * variant" for a product created after that point).
 */
async function resolveVariant(productId: string, variantId: string | null): Promise<{ id: string } | { error: string }> {
  if (variantId) {
    const variant = await db.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) return { error: "That option is no longer available." };
    if (!variant.isActive || variant.stockQty <= 0) return { error: "That option is sold out." };
    return { id: variant.id };
  }
  const defaultVariant = await db.productVariant.findFirst({
    where: { productId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });
  if (!defaultVariant) return { error: "This product is currently out of stock." };
  return { id: defaultVariant.id };
}

export async function addProductToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const requestedVariantId = formData.get("variantId") ? String(formData.get("variantId")) : null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const redirectPath = String(formData.get("redirectPath") ?? "/marketplace");

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || !product.isPublished || product.isAgeRestricted) {
    return { status: "error", message: "This product is not available." };
  }
  if (product.availability !== "AVAILABLE") {
    return { status: "error", message: "This product is currently out of stock." };
  }

  const resolved = await resolveVariant(productId, requestedVariantId);
  if ("error" in resolved) return { status: "error", message: resolved.error };
  const variantId = resolved.id;

  const cartId = await requireCartId(redirectPath);

  const existing = await db.cartItem.findFirst({ where: { cartId, productId, variantId } });
  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
  } else {
    await db.cartItem.create({ data: { cartId, productId, variantId, quantity } });
  }

  revalidatePath("/cart");
  revalidatePath(redirectPath);
  return { status: "success", message: "Added to cart." };
}

export async function buyNowAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const requestedVariantId = formData.get("variantId") ? String(formData.get("variantId")) : null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || !product.isPublished || product.isAgeRestricted || product.availability !== "AVAILABLE") {
    redirect(`/marketplace`);
  }

  const resolved = await resolveVariant(productId, requestedVariantId);
  if ("error" in resolved) redirect(`/marketplace`);
  const variantId = resolved.id;

  const cartId = await requireCartId("/checkout");
  const existing = await db.cartItem.findFirst({ where: { cartId, productId, variantId } });
  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
  } else {
    await db.cartItem.create({ data: { cartId, productId, variantId, quantity } });
  }

  redirect("/checkout");
}

export type SelectedAddOn = { groupId: string; groupName: string; addOnId: string; name: string; priceDelta: number };

export async function addMenuItemToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const specialInstructions = formData.get("specialInstructions") ? String(formData.get("specialInstructions")) : null;
  const redirectPath = String(formData.get("redirectPath") ?? "/restaurants");
  const submittedAddOnIds = formData.getAll("addOnId").map(String);

  const menuItem = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: { addOnGroups: { include: { addOns: true } } },
  });
  if (!menuItem || !menuItem.isAvailable) {
    return { status: "error", message: "This item is not available." };
  }

  // Re-derive selections from the authoritative menu data — never trust
  // client-submitted names/prices.
  const selectedAddOns: SelectedAddOn[] = [];
  for (const group of menuItem.addOnGroups) {
    const picked = group.addOns.filter((a) => submittedAddOnIds.includes(a.id));
    if (group.isRequired && picked.length === 0) {
      return { status: "error", message: `Please choose an option for "${group.name}".` };
    }
    if (picked.length > group.maxSelect) {
      return { status: "error", message: `You can choose up to ${group.maxSelect} option(s) for "${group.name}".` };
    }
    for (const a of picked) {
      selectedAddOns.push({ groupId: group.id, groupName: group.name, addOnId: a.id, name: a.name, priceDelta: Number(a.priceDelta) });
    }
  }

  const cartId = await requireCartId(redirectPath);
  const addOnsJson = selectedAddOns.length > 0 ? selectedAddOns : null;

  // Restaurant items from a different vendor cannot share a cart line with grocery items —
  // each vendor settles as its own Order at checkout, so we just add the line item. Items
  // with different add-on selections get separate lines rather than merging quantities.
  const existing = await db.cartItem.findMany({ where: { cartId, menuItemId, specialInstructions } });
  const matching = existing.find((e) => JSON.stringify(e.selectedAddOns) === JSON.stringify(addOnsJson));

  if (matching) {
    await db.cartItem.update({ where: { id: matching.id }, data: { quantity: matching.quantity + quantity } });
  } else {
    await db.cartItem.create({ data: { cartId, menuItemId, quantity, specialInstructions, selectedAddOns: addOnsJson ?? undefined } });
  }

  revalidatePath("/cart");
  revalidatePath(redirectPath);
  return { status: "success", message: "Added to cart." };
}

export async function updateCartItemQuantityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Math.max(0, Number(formData.get("quantity") ?? 1));

  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== user.id) {
    return { status: "error", message: "Item not found." };
  }

  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  revalidatePath("/cart");
  return { status: "success" };
}

export async function removeCartItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("itemId") ?? "");
  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== user.id) {
    return { status: "error", message: "Item not found." };
  }

  await db.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
  return { status: "success" };
}

export async function toggleWishlistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/marketplace");

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(redirectPath)}`);

  const wishlist = await db.wishlist.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  const existing = await db.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wishlist.id, productId } } });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await db.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
  }

  revalidatePath(redirectPath);
  revalidatePath("/account/wishlist");
  return { status: "success" };
}
