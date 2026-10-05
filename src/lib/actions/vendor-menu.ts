"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  menuSchema,
  menuItemSchema,
  updateMenuItemSchema,
  addOnGroupSchema,
  updateAddOnGroupSchema,
  addOnSchema,
  updateAddOnSchema,
  menuItemPhotosSchema,
  menuItemSuggestionsSchema,
  MAX_MENU_ITEM_PHOTOS,
  MAX_SUGGESTED_ITEMS,
} from "@/lib/validation/menu-item";
import type { ActionState } from "./types";

async function requireRestaurant() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) redirect("/login?next=/vendor/menu");
  if (user.vendorProfile.businessType !== "RESTAURANT") redirect("/vendor");
  return user.vendorProfile.id;
}

function fieldErrorsOf(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
  return fieldErrors;
}

export async function createMenuAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const parsed = menuSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid name." };

  await db.restaurantMenu.create({ data: { vendorId, name: parsed.data.name } });
  revalidatePath("/vendor/menu");
  return { status: "success" };
}

export async function createMenuItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();

  const menuId = String(formData.get("menuId") ?? "");
  const menu = await db.restaurantMenu.findUnique({ where: { id: menuId } });
  if (!menu || menu.vendorId !== vendorId) return { status: "error", message: "Menu not found." };

  const parsed = menuItemSchema.safeParse({
    menuId,
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    imageUrl: formData.get("imageUrl"),
    ingredients: formData.get("ingredients"),
    allergens: formData.get("allergens"),
  });
  if (!parsed.success) return { status: "error", message: "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.menuItem.create({
    data: {
      menuId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
      imageUrl: parsed.data.imageUrl || null,
      ingredients: parsed.data.ingredients ?? null,
      allergens: parsed.data.allergens ?? null,
    },
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Item added." };
}

export async function updateMenuItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: itemId }, include: { menu: true } });
  if (!item || item.menu.vendorId !== vendorId) return { status: "error", message: "Item not found." };

  const parsed = updateMenuItemSchema.safeParse({
    itemId,
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    ingredients: formData.get("ingredients"),
    allergens: formData.get("allergens"),
  });
  if (!parsed.success) return { status: "error", message: "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.menuItem.update({
    where: { id: itemId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
      ingredients: parsed.data.ingredients ?? null,
      allergens: parsed.data.allergens ?? null,
    },
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Item updated." };
}

export async function toggleMenuItemAvailabilityAction(formData: FormData): Promise<void> {
  const vendorId = await requireRestaurant();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: itemId }, include: { menu: true } });
  if (item && item.menu.vendorId === vendorId) {
    await db.menuItem.update({ where: { id: itemId }, data: { isAvailable: !item.isAvailable } });
  }
  revalidatePath("/vendor/menu");
}

export async function deleteMenuItemAction(formData: FormData): Promise<void> {
  const vendorId = await requireRestaurant();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: itemId }, include: { menu: true } });
  if (item && item.menu.vendorId === vendorId) {
    await db.menuItem.delete({ where: { id: itemId } });
  }
  revalidatePath("/vendor/menu");
}

// The form only ever renders MAX_MENU_ITEM_PHOTOS upload slots, but this is a
// server action — cap it here too in case of a tampered/direct POST.
function getPhotoUrls(formData: FormData): string[] {
  return formData
    .getAll("photoUrls")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, MAX_MENU_ITEM_PHOTOS);
}

export async function updateMenuItemPhotosAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: itemId }, include: { menu: true } });
  if (!item || item.menu.vendorId !== vendorId) return { status: "error", message: "Item not found." };

  const photoUrls = getPhotoUrls(formData);
  const parsed = menuItemPhotosSchema.safeParse(photoUrls);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid photos." };

  await db.$transaction(async (tx) => {
    // Slots are pre-filled with each photo's current URL, so a plain resubmit
    // round-trips the same set unchanged — safe to fully replace here.
    await tx.menuItemPhoto.deleteMany({ where: { menuItemId: itemId } });
    if (parsed.data.length > 0) {
      await tx.menuItemPhoto.createMany({ data: parsed.data.map((url, sortOrder) => ({ menuItemId: itemId, url, sortOrder })) });
    }
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Photos saved." };
}

export async function updateMenuItemSuggestionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: itemId }, include: { menu: true } });
  if (!item || item.menu.vendorId !== vendorId) return { status: "error", message: "Item not found." };

  const submittedIds = formData.getAll("suggestedItemId").map(String);
  const parsed = menuItemSuggestionsSchema.safeParse(submittedIds);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid selection." };

  // Only items that genuinely belong to this vendor and aren't the item
  // itself can be suggested — never trust the submitted id list as-is.
  const validSuggested = await db.menuItem.findMany({
    where: { id: { in: parsed.data, not: itemId }, menu: { vendorId } },
    select: { id: true },
  });
  const validIds = validSuggested.map((m) => m.id).slice(0, MAX_SUGGESTED_ITEMS);

  await db.$transaction(async (tx) => {
    await tx.menuItemSuggestion.deleteMany({ where: { menuItemId: itemId } });
    if (validIds.length > 0) {
      await tx.menuItemSuggestion.createMany({
        data: validIds.map((suggestedItemId, sortOrder) => ({ menuItemId: itemId, suggestedItemId, sortOrder })),
      });
    }
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Suggestions saved." };
}

/** Creates an option group ("Size", "Extras") on an item, with required/optional + min/max choice counts. */
export async function createAddOnGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: menuItemId }, include: { menu: true } });
  if (!item || item.menu.vendorId !== vendorId) return { status: "error", message: "Item not found." };

  const parsed = addOnGroupSchema.safeParse({
    menuItemId,
    name: formData.get("name"),
    isRequired: formData.get("isRequired") === "1",
    minSelect: formData.get("minSelect") || "0",
    maxSelect: formData.get("maxSelect") || "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.addOnGroup.create({
    data: { menuItemId, name: parsed.data.name, isRequired: parsed.data.isRequired, minSelect: parsed.data.minSelect, maxSelect: parsed.data.maxSelect },
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Option group added." };
}

export async function updateAddOnGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await db.addOnGroup.findUnique({ where: { id: groupId }, include: { menuItem: { include: { menu: true } } } });
  if (!group || group.menuItem.menu.vendorId !== vendorId) return { status: "error", message: "Option group not found." };

  const parsed = updateAddOnGroupSchema.safeParse({
    groupId,
    name: formData.get("name"),
    isRequired: formData.get("isRequired") === "1",
    minSelect: formData.get("minSelect") || "0",
    maxSelect: formData.get("maxSelect") || "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.addOnGroup.update({
    where: { id: groupId },
    data: { name: parsed.data.name, isRequired: parsed.data.isRequired, minSelect: parsed.data.minSelect, maxSelect: parsed.data.maxSelect },
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Option group updated." };
}

export async function deleteAddOnGroupAction(formData: FormData): Promise<void> {
  const vendorId = await requireRestaurant();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await db.addOnGroup.findUnique({ where: { id: groupId }, include: { menuItem: { include: { menu: true } } } });
  if (group && group.menuItem.menu.vendorId === vendorId) {
    await db.addOnGroup.delete({ where: { id: groupId } });
  }
  revalidatePath("/vendor/menu");
}

/** Adds one choice (e.g. "Large", "+Tk 50") to an existing group. */
export async function createAddOnAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await db.addOnGroup.findUnique({ where: { id: groupId }, include: { menuItem: { include: { menu: true } } } });
  if (!group || group.menuItem.menu.vendorId !== vendorId) return { status: "error", message: "Option group not found." };

  const parsed = addOnSchema.safeParse({
    groupId,
    name: formData.get("name"),
    priceDelta: formData.get("priceDelta") || "0",
    isPopular: formData.get("isPopular") === "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.addOn.create({ data: { groupId, name: parsed.data.name, priceDelta: parsed.data.priceDelta, isPopular: parsed.data.isPopular } });
  revalidatePath("/vendor/menu");
  return { status: "success", message: "Option added." };
}

export async function updateAddOnAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const addOnId = String(formData.get("addOnId") ?? "");
  const addOn = await db.addOn.findUnique({ where: { id: addOnId }, include: { group: { include: { menuItem: { include: { menu: true } } } } } });
  if (!addOn || addOn.group.menuItem.menu.vendorId !== vendorId) return { status: "error", message: "Option not found." };

  const parsed = updateAddOnSchema.safeParse({
    addOnId,
    name: formData.get("name"),
    priceDelta: formData.get("priceDelta") || "0",
    isPopular: formData.get("isPopular") === "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.addOn.update({ where: { id: addOnId }, data: { name: parsed.data.name, priceDelta: parsed.data.priceDelta, isPopular: parsed.data.isPopular } });
  revalidatePath("/vendor/menu");
  return { status: "success", message: "Option updated." };
}

export async function toggleAddOnAvailabilityAction(formData: FormData): Promise<void> {
  const vendorId = await requireRestaurant();
  const addOnId = String(formData.get("addOnId") ?? "");
  const addOn = await db.addOn.findUnique({ where: { id: addOnId }, include: { group: { include: { menuItem: { include: { menu: true } } } } } });
  if (addOn && addOn.group.menuItem.menu.vendorId === vendorId) {
    await db.addOn.update({ where: { id: addOnId }, data: { isAvailable: !addOn.isAvailable } });
  }
  revalidatePath("/vendor/menu");
}

export async function deleteAddOnAction(formData: FormData): Promise<void> {
  const vendorId = await requireRestaurant();
  const addOnId = String(formData.get("addOnId") ?? "");
  const addOn = await db.addOn.findUnique({ where: { id: addOnId }, include: { group: { include: { menuItem: { include: { menu: true } } } } } });
  if (addOn && addOn.group.menuItem.menu.vendorId === vendorId) {
    await db.addOn.delete({ where: { id: addOnId } });
  }
  revalidatePath("/vendor/menu");
}
