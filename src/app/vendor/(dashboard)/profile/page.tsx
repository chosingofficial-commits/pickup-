import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { BusinessProfileForm } from "@/components/vendor-dashboard/business-profile-form";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getVendorForUser } from "@/lib/vendor/queries";

export const metadata: Metadata = { title: "Business profile" };

export default async function VendorProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const vendor = await getVendorForUser(user.id);
  if (!vendor) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Business profile</h1>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Details</CardTitle>
          <BusinessProfileForm
            defaults={{
              businessName: vendor.businessName,
              description: vendor.description ?? "",
              phone: vendor.phone,
              email: vendor.email,
              addressText: vendor.addressText,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Password & security</CardTitle>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
