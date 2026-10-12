import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { PaymentMethodSettingsForm, type PaymentMethodRow } from "@/components/admin/payment-method-settings-form";
import { getSiteSettings } from "@/lib/settings";
import { PAYMENT_METHOD_PROVIDERS, PAYMENT_METHOD_LABELS, paymentMethodSettingKey } from "@/lib/payments/method-settings";
import { isGatewayLive } from "@/lib/payments/gateway-status";
import { getPushConfigStatus, getVapidEnvDiagnostics } from "@/lib/push/send";

export const metadata: Metadata = { title: "Settings" };

function ProcessEnvTable({ rows }: { rows: { name: string; presentInProcessEnv: boolean; rawLength: number }[] }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className="pr-3 font-medium">Var</th>
          <th className="pr-3 font-medium">In process.env?</th>
          <th className="font-medium">Length</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td className="pr-3">{row.name}</td>
            <td className="pr-3">{row.presentInProcessEnv ? "yes" : "no"}</td>
            <td>{row.rawLength}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ParsedEnvTable({ rows }: { rows: { name: string; length: number }[] }) {
  return (
    <table className="w-full text-left">
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td className="pr-3">{row.name}</td>
            <td>{row.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// This page reads cookies() (via getCurrentUser() in the admin layout) so
// Next.js already renders it dynamically per-request, never statically at
// build time — forced explicitly here too so the Diagnostics card below can
// never be mistaken for a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  const pushStatus = getPushConfigStatus();
  const vapidDiagnostics = getVapidEnvDiagnostics();

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

          {/* TEMPORARY debug aid — see getVapidEnvDiagnostics()'s doc comment.
              Lengths only, never values. Remove once hPanel's reduced var
              count is confirmed stable. */}
          <div className="mt-4 space-y-3 rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-700">Env var debug (temporary — lengths only, never values)</p>
            <p>
              NODE_ENV: <code>{JSON.stringify(vapidDiagnostics.nodeEnv)}</code>
            </p>

            <p className="font-semibold text-gray-700">Runtime secrets — must be in process.env, no safe default</p>
            <ProcessEnvTable rows={vapidDiagnostics.runtimeFromProcessEnv} />
            <p className="text-gray-500">As parsed by the app:</p>
            <ParsedEnvTable rows={vapidDiagnostics.runtimeFromParsedEnv} />

            <p className="font-semibold text-gray-700">Other vars with no safe default (still must stay in hPanel)</p>
            <ProcessEnvTable rows={vapidDiagnostics.noDefaultFromProcessEnv} />

            <p className="font-semibold text-gray-700">Now have a production-safe default (safe to delete from hPanel)</p>
            <ProcessEnvTable rows={vapidDiagnostics.nowDefaultedFromProcessEnv} />
            <p className="text-gray-500">As parsed by the app (the default, if process.env is empty above):</p>
            <ParsedEnvTable rows={vapidDiagnostics.nowDefaultedFromParsedEnv} />

            <p className="font-semibold text-gray-700">Public key — build-time inlined, now has a hardcoded fallback too</p>
            <ProcessEnvTable rows={[vapidDiagnostics.publicKeyFromProcessEnv]} />
            <ParsedEnvTable rows={[vapidDiagnostics.publicKeyFromParsedEnv]} />

            {vapidDiagnostics.otherVapidLikeKeys.length > 0 && (
              <>
                <p className="font-semibold text-gray-700">Other process.env keys containing &quot;VAPID&quot;</p>
                <ul className="list-disc pl-4">
                  {vapidDiagnostics.otherVapidLikeKeys.map((row) => (
                    <li key={row.key}>
                      <code>{JSON.stringify(row.key)}</code> (length {row.length})
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
