"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { parseWeeklyHoursFormData } from "@/lib/restaurant/weekly-hours-form-data";
import type { ActionState } from "./types";

async function requireRestaurant() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) redirect("/login?next=/vendor/hours");
  if (user.vendorProfile.businessType !== "RESTAURANT") redirect("/vendor");
  const restaurant = await db.restaurant.findUnique({ where: { vendorId: user.vendorProfile.id } });
  if (!restaurant) redirect("/vendor");
  return restaurant;
}

export async function updateWeeklyHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurant = await requireRestaurant();
  const days = parseWeeklyHoursFormData(formData);
  if (!days) return { status: "error", message: "Please set hours for all 7 days." };

  for (const d of days) {
    await db.restaurantWeeklyHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: d.dayOfWeek } },
      create: { restaurantId: restaurant.id, ...d },
      update: { opensAt: d.opensAt, closesAt: d.closesAt, isClosed: d.isClosed },
    });
  }

  revalidatePath("/vendor/hours");
  return { status: "success", message: "Opening hours updated." };
}

async function requireGroceryVendor() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) redirect("/login?next=/vendor/hours");
  if (user.vendorProfile.businessType !== "GROCERY_VENDOR") redirect("/vendor");
  return user.vendorProfile;
}

/** Grocery-shop equivalent of updateWeeklyHoursAction, writing to VendorWeeklyHours instead of RestaurantWeeklyHours — see Vendor.isManuallyClosed's schema doc comment for why these are separate tables. */
export async function updateShopWeeklyHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendor = await requireGroceryVendor();
  const days = parseWeeklyHoursFormData(formData);
  if (!days) return { status: "error", message: "Please set hours for all 7 days." };

  for (const d of days) {
    await db.vendorWeeklyHours.upsert({
      where: { vendorId_dayOfWeek: { vendorId: vendor.id, dayOfWeek: d.dayOfWeek } },
      create: { vendorId: vendor.id, ...d },
      update: { opensAt: d.opensAt, closesAt: d.closesAt, isClosed: d.isClosed },
    });
  }

  revalidatePath("/vendor/hours");
  return { status: "success", message: "Opening hours updated." };
}

/** Grocery-shop equivalent of updateRestaurantSettingsAction, minus the restaurant-only prep-time/minimum-order fields. */
export async function updateShopHoursSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const vendor = await requireGroceryVendor();

  const isManuallyClosed = formData.get("isManuallyClosed") === "1";
  const scheduledOrderingEnabled = formData.get("scheduledOrderingEnabled") === "1";
  const temporaryClosureUntilRaw = String(formData.get("temporaryClosureUntil") ?? "");
  const temporaryClosureUntil = temporaryClosureUntilRaw ? new Date(temporaryClosureUntilRaw) : null;

  await db.vendor.update({
    where: { id: vendor.id },
    data: { isManuallyClosed, scheduledOrderingEnabled, temporaryClosureUntil },
  });

  revalidatePath("/vendor/hours");
  return { status: "success", message: "Settings updated." };
}

export async function updateRestaurantSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurant = await requireRestaurant();

  const prepRaw = String(formData.get("preparationTimeMinutes") ?? "");
  const preparationTimeMinutesInput = Number(prepRaw);
  if (prepRaw.trim() !== "" && !Number.isFinite(preparationTimeMinutesInput)) {
    return { status: "error", message: "Enter a valid preparation time in minutes." };
  }
  const preparationTimeMinutes = Math.max(5, prepRaw.trim() === "" ? 20 : preparationTimeMinutesInput);

  const isManuallyClosed = formData.get("isManuallyClosed") === "1";
  const scheduledOrderingEnabled = formData.get("scheduledOrderingEnabled") === "1";
  const temporaryClosureUntilRaw = String(formData.get("temporaryClosureUntil") ?? "");
  const temporaryClosureUntil = temporaryClosureUntilRaw ? new Date(temporaryClosureUntilRaw) : null;

  const minAmountRaw = String(formData.get("minimumOrderAmount") ?? "");
  const minimumOrderAmountInput = Number(minAmountRaw);
  if (minAmountRaw.trim() !== "" && !Number.isFinite(minimumOrderAmountInput)) {
    return { status: "error", message: "Enter a valid minimum order amount in Tk." };
  }
  const minimumOrderAmount = Math.max(0, minAmountRaw.trim() === "" ? 0 : minimumOrderAmountInput);

  await db.restaurant.update({
    where: { id: restaurant.id },
    data: { preparationTimeMinutes, isManuallyClosed, scheduledOrderingEnabled, temporaryClosureUntil, minimumOrderAmount },
  });

  revalidatePath("/vendor/hours");
  return { status: "success", message: "Settings updated." };
}
