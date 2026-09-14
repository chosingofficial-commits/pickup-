import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata: Metadata = { title: "Password & security" };

export default function AccountSecurityPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Password & security</h1>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Change password</CardTitle>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
