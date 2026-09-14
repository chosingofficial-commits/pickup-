import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Settings</h1>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Platform settings</CardTitle>
          <SiteSettingsForm defaults={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
