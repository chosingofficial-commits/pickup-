"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { menuSchema, menuItemSchema } from "@/lib/validation/menu-item";
import type { ActionState } from "./types";

async function requireRestaurant() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) redirect("/login?next=/vendor/menu");
  if (user.vendorProfile.businessType !== "RESTAURANT") redirect("/vendor");
  return user.vendorProfile.id;
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
    imageUrl: formData.get("imageUrl"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  await db.menuItem.create({
    data: {
      menuId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  revalidatePath("/vendor/menu");
  return { status: "success", message: "Item added." };
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
