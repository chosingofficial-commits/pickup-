import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/profile-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">My account</h1>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Profile details</CardTitle>
          <ProfileForm name={user.name} email={user.email ?? ""} phone={user.phone} />
        </CardContent>
      </Card>
    </div>
  );
}
