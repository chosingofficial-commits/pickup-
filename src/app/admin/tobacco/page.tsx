import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TobaccoSettingsForm } from "@/components/admin/tobacco-settings-form";
import { emergencyDisableTobaccoAction } from "@/lib/actions/admin-tobacco";
import { serverEnv } from "@/lib/env/server";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Age-restricted products" };

export default async function AdminTobaccoPage() {
  const [setting, restrictedLogs, categories] = await Promise.all([
    db.ageRestrictedProductSetting.findFirst(),
    db.restrictedDeliveryLog.findMany({
      include: { rider: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.category.findMany({ where: { isAgeRestricted: true } }),
  ]);

  const defaults = {
    tobaccoSalesEnabled: setting?.tobaccoSalesEnabled ?? false,
    minimumAge: setting?.minimumAge ?? 18,
    exclusionRadiusMeters: setting?.exclusionRadiusMeters ?? 100,
    healthWarningText: setting?.healthWarningText ?? "Smoking is injurious to health.",
  };

  const effectivelyEnabled = serverEnv.TOBACCO_SALES_ENABLED && defaults.tobaccoSalesEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Age-restricted products</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cigarettes and smoking accessories are disabled by default and must not be enabled without a completed
          legal and compliance review. This module never supports e-cigarettes, vapes, or nicotine pouches.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-control border border-border-brand bg-white p-3">
        <ShieldAlert className={`h-5 w-5 ${effectivelyEnabled ? "text-red-600" : "text-brand-primary"}`} aria-hidden />
        <span className="text-sm font-semibold text-brand-dark">
          Module is currently {effectivelyEnabled ? "ENABLED — live to customers" : "disabled"}
        </span>
        {effectivelyEnabled && (
          <form action={emergencyDisableTobaccoAction} className="ml-auto">
            <button type="submit" className="rounded-control bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
              Emergency disable now
            </button>
          </form>
        )}
      </div>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Compliance settings</CardTitle>
          <TobaccoSettingsForm defaults={defaults} envEnabled={serverEnv.TOBACCO_SALES_ENABLED} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Age-restricted categories</CardTitle>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.name}</span>
                <Badge variant={c.isActive ? "danger" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Manage individual categories from Categories in the sidebar.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-3">Age-restricted delivery audit log</CardTitle>
          {restrictedLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No age-restricted deliveries recorded.</p>
          ) : (
            <div className="space-y-2">
              {restrictedLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-control border border-border-brand p-3 text-sm">
                  <span>
                    {log.rider.user.name} · {log.idDocumentType ?? "No ID type recorded"}
                  </span>
                  <Badge variant={log.verificationResult === "VERIFIED" ? "brand" : "danger"}>{log.verificationResult}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
