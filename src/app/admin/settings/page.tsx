import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { PaymentMethodSettingsForm, type PaymentMethodRow } from "@/components/admin/payment-method-settings-form";
import { getSiteSettings } from "@/lib/settings";
import { PAYMENT_METHOD_PROVIDERS, PAYMENT_METHOD_LABELS, paymentMethodSettingKey } from "@/lib/payments/method-settings";
import { isGatewayLive } from "@/lib/payments/gateway-status";
import { getPushConfigStatus } from "@/lib/push/send";
import { getMissingRequiredVars, getEnvFilesOnServer } from "@/lib/env/diagnostics";

export const metadata: Metadata = { title: "Settings" };

// This page reads cookies() (via getCurrentUser() in the admin layout) so
// Next.js already renders it dynamically per-request, never statically at
// build time — forced explicitly here too so the Diagnostics card below can
// never be mistaken for a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  const pushStatus = getPushConfigStatus();
  const missingVars = getMissingRequiredVars();
  const envFiles = getEnvFilesOnServer();

  const paymentMethodRows: PaymentMethodRow[] = PAYMENT_METHOD_PROVIDERS.map((provider) => ({
    provider,
    label: PAYMENT_METHOD_LABELS[provider],
    enabled: settings[paymentMethodSettingKey(provider)] === "1",
    live: isGatewayLive(provider),
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Settings</h1>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Platform settings</CardTitle>
          <SiteSettingsForm defaults={settings} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-1">Payment methods</CardTitle>
          <p className="mb-4 text-sm text-gray-600">Choose which methods customers can pay with at checkout.</p>
          <PaymentMethodSettingsForm rows={paymentMethodRows} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Diagnostics</CardTitle>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-brand-dark">Push alerts</p>
              {!pushStatus.configured && pushStatus.reason && <p className="mt-0.5 text-xs text-gray-500">{pushStatus.reason}</p>}
            </div>
            <Badge variant={pushStatus.configured ? "brand" : "dark"}>{pushStatus.configured ? "Configured" : "Not configured"}</Badge>
          </div>

          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>{missingVars.length === 0 ? "All required settings found." : `Missing on server: ${missingVars.join(", ")}`}</p>
            <p>{envFiles.length === 0 ? "Env files on server: none." : `Env files on server: ${envFiles.join(", ")}`}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
