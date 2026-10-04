"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { menuSchema, menuItemSchema, updateMenuItemSchema, addOnGroupSchema, addOnSchema } from "@/lib/validation/menu-item";
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
  });
  if (!parsed.success) return { status: "error", message: "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.menuItem.update({
    where: { id: itemId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
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

/** Creates an option group ("Size", "Extras") on an item — "choose one" (maxSelect 1, radio) or "choose several" (maxSelect > 1, checkboxes), optionally required. */
export async function createAddOnGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const item = await db.menuItem.findUnique({ where: { id: menuItemId }, include: { menu: true } });
  if (!item || item.menu.vendorId !== vendorId) return { status: "error", message: "Item not found." };

  const parsed = addOnGroupSchema.safeParse({
    menuItemId,
    name: formData.get("name"),
    isRequired: formData.get("isRequired") === "1",
    maxSelect: formData.get("maxSelect") || "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.addOnGroup.create({
    data: { menuItemId, name: parsed.data.name, isRequired: parsed.data.isRequired, maxSelect: parsed.data.maxSelect },
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Option group added." };
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

/** Adds one option (e.g. "Large", "+Tk 50") to an existing group. */
export async function createAddOnAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendorId = await requireRestaurant();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await db.addOnGroup.findUnique({ where: { id: groupId }, include: { menuItem: { include: { menu: true } } } });
  if (!group || group.menuItem.menu.vendorId !== vendorId) return { status: "error", message: "Option group not found." };

  const parsed = addOnSchema.safeParse({ groupId, name: formData.get("name"), priceDelta: formData.get("priceDelta") || "0" });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.addOn.create({ data: { groupId, name: parsed.data.name, priceDelta: parsed.data.priceDelta } });
  revalidatePath("/vendor/menu");
  return { status: "success", message: "Option added." };
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
