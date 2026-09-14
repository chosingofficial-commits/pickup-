import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { WeeklyHoursForm } from "@/components/vendor-dashboard/weekly-hours-form";
import { RestaurantSettingsForm } from "@/components/vendor-dashboard/restaurant-settings-form";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Opening hours" };

export default async function VendorHoursPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile || user.vendorProfile.businessType !== "RESTAURANT") return null;

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
          <WeeklyHoursForm defaults={restaurant.weeklyHours} />
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
