import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { WeeklyHoursForm } from "@/components/vendor-dashboard/weekly-hours-form";
import { RestaurantSettingsForm } from "@/components/vendor-dashboard/restaurant-settings-form";
import { ShopHoursSettingsForm } from "@/components/vendor-dashboard/shop-hours-settings-form";
import { updateWeeklyHoursAction, updateShopWeeklyHoursAction } from "@/lib/actions/vendor-hours";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Opening hours" };

export default async function VendorHoursPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  if (user.vendorProfile.businessType === "RESTAURANT") {
    const restaurant = await db.restaurant.findUnique({
      where: { vendorId: user.vendorProfile.id },
      include: { weeklyHours: true },
    });
    if (!restaurant) return null;

    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Opening hours</h1>

        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-4">Weekly schedule</CardTitle>
            <WeeklyHoursForm defaults={restaurant.weeklyHours} action={updateWeeklyHoursAction} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-4">Order settings</CardTitle>
            <RestaurantSettingsForm
              defaults={{
                preparationTimeMinutes: restaurant.preparationTimeMinutes,
                isManuallyClosed: restaurant.isManuallyClosed,
                scheduledOrderingEnabled: restaurant.scheduledOrderingEnabled,
                minimumOrderAmount: Number(restaurant.minimumOrderAmount),
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.vendorProfile.businessType === "GROCERY_VENDOR") {
    const vendor = await db.vendor.findUnique({
      where: { id: user.vendorProfile.id },
      include: { weeklyHours: { orderBy: { dayOfWeek: "asc" } } },
    });
    if (!vendor) return null;

    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Opening hours</h1>
        {vendor.weeklyHours.length === 0 && (
          <p className="rounded-control bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
            Your shop is currently open 24/7 by default. Set your opening hours below if that&apos;s not right.
          </p>
        )}

        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-4">Weekly schedule</CardTitle>
            <WeeklyHoursForm defaults={vendor.weeklyHours} action={updateShopWeeklyHoursAction} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-4">Order settings</CardTitle>
            <ShopHoursSettingsForm
              defaults={{
                isManuallyClosed: vendor.isManuallyClosed,
                scheduledOrderingEnabled: vendor.scheduledOrderingEnabled,
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
