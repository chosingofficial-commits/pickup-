"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { addressSchema } from "@/lib/validation/address";
import { updateCheckoutState } from "@/lib/checkout/cookie";
import type { ActionState } from "./types";

export async function addAddressAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || "Home",
    recipientName: formData.get("recipientName"),
    recipientPhone: formData.get("recipientPhone"),
    neighbourhoodId: formData.get("neighbourhoodId") || "",
    streetOrVillage: formData.get("streetOrVillage"),
    landmark: formData.get("landmark"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value;
    }
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const neighbourhood = await db.neighbourhood.findUnique({ where: { id: parsed.data.neighbourhoodId } });
  if (!neighbourhood) return { status: "error", message: "Choose a valid area." };

  const zone = await db.deliveryZone.findFirst({
    where: { neighbourhoodId: neighbourhood.id, isActive: true, serviceArea: { isActive: true } },
  });

  const existingCount = await db.address.count({ where: { userId: user.id, deletedAt: null } });

  const address = await db.address.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      recipientName: parsed.data.recipientName,
      recipientPhone: parsed.data.recipientPhone,
      neighbourhoodId: neighbourhood.id,
      deliveryZoneId: zone?.id,
      streetOrVillage: parsed.data.streetOrVillage,
      landmark: parsed.data.landmark || null,
      lat: neighbourhood.centerLat,
      lng: neighbourhood.centerLng,
      isDefault: existingCount === 0,
    },
  });

  await updateCheckoutState({ addressId: address.id });
  revalidatePath("/checkout");
  revalidatePath("/account/addresses");

  // Only redirect onward when this form was rendered inside checkout (see
  // AddressForm's `checkoutRedirect` prop) — the same form/action is reused
  // on /account/addresses, where saving should just leave the customer there.
  if (formData.get("checkoutRedirect") === "1") redirect("/checkout/schedule");
  return { status: "success", message: "Address saved." };
}

export async function selectCheckoutAddressAction(formData: FormData): Promise<void> {
  const addressId = String(formData.get("addressId") ?? "");
  await updateCheckoutState({ addressId });
  redirect("/checkout/schedule");
}

export async function deleteAddressAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const addressId = String(formData.get("addressId") ?? "");
  const address = await db.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== user.id) return { status: "error", message: "Address not found." };

  await db.address.update({ where: { id: addressId }, data: { deletedAt: new Date() } });
  revalidatePath("/account/addresses");
  return { status: "success" };
}
