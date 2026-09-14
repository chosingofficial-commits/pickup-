"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionState } from "./types";

const DAY_COUNT = 7;

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

  for (let day = 0; day < DAY_COUNT; day++) {
    const isClosed = formData.get(`closed-${day}`) === "1";
    const opensAt = String(formData.get(`opens-${day}`) ?? "10:00");
    const closesAt = String(formData.get(`closes-${day}`) ?? "22:00");

    await db.restaurantWeeklyHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: day } },
      create: { restaurantId: restaurant.id, dayOfWeek: day, opensAt, closesAt, isClosed },
      update: { opensAt, closesAt, isClosed },
    });
  }

  revalidatePath("/vendor/hours");
  return { status: "success", message: "Opening hours updated." };
}

export async function updateRestaurantSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurant = await requireRestaurant();

  const preparationTimeMinutes = Math.max(5, Number(formData.get("preparationTimeMinutes") ?? 20));
  const isManuallyClosed = formData.get("isManuallyClosed") === "1";
  const scheduledOrderingEnabled = formData.get("scheduledOrderingEnabled") === "1";
  const temporaryClosureUntilRaw = String(formData.get("temporaryClosureUntil") ?? "");
  const temporaryClosureUntil = temporaryClosureUntilRaw ? new Date(temporaryClosureUntilRaw) : null;
  const minimumOrderAmount = Math.max(0, Number(formData.get("minimumOrderAmount") ?? 0));

  await db.restaurant.update({
    where: { id: restaurant.id },
    data: { preparationTimeMinutes, isManuallyClosed, scheduledOrderingEnabled, temporaryClosureUntil, minimumOrderAmount },
  });

  revalidatePath("/vendor/hours");
  return { status: "success", message: "Settings updated." };
}
