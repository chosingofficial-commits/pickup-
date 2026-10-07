import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/account/profile-form";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Profile" };

const VEHICLE_LABELS: Record<string, string> = { BICYCLE: "Bicycle", MOTORBIKE: "Motorbike", OTHER: "Other" };

export default async function RiderProfilePage() {
  const user = await getCurrentUser();
  if (!user?.riderProfile) return null;

  const rider = await db.riderProfile.findUniqueOrThrow({
    where: { id: user.riderProfile.id },
    select: { vehicleType: true, nationalIdNo: true, nationalIdDocKey: true, licenseCheckedInOffice: true, photoCheckedInOffice: true, commissionRatePct: true },
  });

  // NID number itself is admin-only — never rendered here, only whether one is on file.
  const nidStatus = rider.nationalIdNo || rider.nationalIdDocKey ? "On file" : "Not submitted";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Profile</h1>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Your details</CardTitle>
          <ProfileForm name={user.name} email={user.email ?? ""} phone={user.phone} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Rider details</CardTitle>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Vehicle type</dt>
              <dd className="text-brand-dark">{rider.vehicleType ? (VEHICLE_LABELS[rider.vehicleType] ?? rider.vehicleType) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">National ID</dt>
              <dd className="text-brand-dark">{nidStatus}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Licence checked in office</dt>
              <dd><Badge variant={rider.licenseCheckedInOffice ? "brand" : "outline"}>{rider.licenseCheckedInOffice ? "Checked" : "Not yet"}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Photo checked in office</dt>
              <dd><Badge variant={rider.photoCheckedInOffice ? "brand" : "outline"}>{rider.photoCheckedInOffice ? "Checked" : "Not yet"}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Commission rate</dt>
              <dd className="font-semibold text-brand-dark">{Number(rider.commissionRatePct)}%</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-500">These are set by Pick Up and can&apos;t be changed here — contact support if something looks wrong.</p>
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
