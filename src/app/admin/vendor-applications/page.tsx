import type { Metadata } from "next";
import { VendorApplicationCard } from "@/components/admin/vendor-application-card";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Vendor applications" };

export default async function AdminVendorApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status ?? "SUBMITTED";

  const applications = await db.vendorApplication.findMany({
    where: filter === "ALL" ? {} : { status: filter as never },
    orderBy: { createdAt: "desc" },
  });

  const filters = [
    { value: "SUBMITTED", label: "New" },
    { value: "UNDER_REVIEW", label: "Under review" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "ALL", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Vendor applications</h1>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <a
            key={f.value}
            href={`/admin/vendor-applications?status=${f.value}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === f.value ? "border-brand-primary bg-brand-primary text-white" : "border-border-brand text-brand-dark hover:bg-brand-bg"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-gray-500">No applications in this view.</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <VendorApplicationCard
              key={app.id}
              application={{
                id: app.id,
                businessName: app.businessName,
                ownerName: app.ownerName,
                businessType: app.businessType,
                phone: app.phone,
                email: app.email,
                addressText: app.addressText,
                status: app.status,
                tradeLicenseNo: app.tradeLicenseNo ?? "",
                tradeLicenseDocKey: app.tradeLicenseDocKey ?? "",
                nationalIdNo: app.nationalIdNo ?? "",
                nationalIdDocKey: app.nationalIdDocKey ?? "",
                paymentMethod: app.paymentMethod,
                paymentReference: app.paymentReference,
                createdAt: app.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
