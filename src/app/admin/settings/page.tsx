import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { PaymentMethodSettingsForm, type PaymentMethodRow } from "@/components/admin/payment-method-settings-form";
import { getSiteSettings } from "@/lib/settings";
import { PAYMENT_METHOD_PROVIDERS, PAYMENT_METHOD_LABELS, paymentMethodSettingKey } from "@/lib/payments/method-settings";
import { isGatewayLive } from "@/lib/payments/gateway-status";
import { getPushConfigStatus } from "@/lib/push/send";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  const pushStatus = getPushConfigStatus();

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
              <p className="text-sm font-medium text-brand-dark">Push alerts (vendor/rider order notifications)</p>
              {!pushStatus.configured && pushStatus.reason && <p className="mt-0.5 text-xs text-gray-500">{pushStatus.reason}</p>}
            </div>
            <Badge variant={pushStatus.configured ? "brand" : "dark"}>{pushStatus.configured ? "Configured" : "Not configured"}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
