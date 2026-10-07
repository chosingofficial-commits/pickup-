import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FileText, Package, Store } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommissionRateEditor } from "@/components/admin/commission-rate-editor";
import { VendorEditForm } from "@/components/admin/vendor-edit-form";
import { AdminWeeklyHoursForm } from "@/components/admin/admin-weekly-hours-form";
import { toggleVendorSuspensionAction } from "@/lib/actions/admin-vendors";
import { getVendorDashboardStats } from "@/lib/vendor/queries";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendor details" };

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;

  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    include: {
      user: { select: { name: true, email: true, phone: true, createdAt: true } },
      application: { select: { id: true, tradeLicenseNo: true, tradeLicenseDocKey: true, nationalIdNo: true, nationalIdDocKey: true } },
      restaurant: { include: { weeklyHours: { orderBy: { dayOfWeek: "asc" } } } },
      _count: { select: { products: true, orders: true } },
    },
  });
  if (!vendor || vendor.deletedAt) notFound();

  const isRestaurant = vendor.businessType === "RESTAURANT";
  const menuItemCount = isRestaurant
    ? await db.menuItem.count({ where: { menu: { vendorId: vendor.id }, deletedAt: null } })
    : 0;

  const [stats, recentOrders] = await Promise.all([
    getVendorDashboardStats(vendor.id),
    db.order.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, customer: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">{vendor.businessName}</h1>
          <p className="text-sm text-gray-500">
            {isRestaurant ? "Restaurant" : "Grocery vendor"} · Created {vendor.createdAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={vendor.isApproved ? "brand" : "accent"}>{vendor.isApproved ? "Approved" : "Not approved"}</Badge>
          <Badge variant={vendor.isSuspended ? "danger" : "brand"}>{vendor.isSuspended ? "Suspended" : "Active"}</Badge>
          <form action={toggleVendorSuspensionAction}>
            <input type="hidden" name="vendorId" value={vendor.id} />
            <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
              {vendor.isSuspended ? "Unsuspend" : "Suspend"}
            </button>
          </form>
        </div>
      </div>

      {(vendor.coverImageUrl || vendor.logoUrl) && (
        <div className="relative h-36 overflow-hidden rounded-card border border-border-brand bg-surface-muted sm:h-48">
          {vendor.coverImageUrl && <Image src={vendor.coverImageUrl} alt="" fill className="object-cover" unoptimized />}
          {vendor.logoUrl ? (
            <Image
              src={vendor.logoUrl}
              alt={`${vendor.businessName} logo`}
              width={64}
              height={64}
              unoptimized
              className="absolute bottom-3 left-3 h-16 w-16 rounded-control border-2 border-white object-cover shadow-soft"
            />
          ) : (
            <div className="absolute bottom-3 left-3 flex h-16 w-16 items-center justify-center rounded-control border-2 border-white bg-white shadow-soft">
              <Store className="h-6 w-6 text-gray-400" aria-hidden />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5">
              <CardTitle className="mb-4">Edit shop details</CardTitle>
              <VendorEditForm
                defaults={{
                  vendorId: vendor.id,
                  businessName: vendor.businessName,
                  description: vendor.description ?? "",
                  phone: vendor.phone,
                  addressText: vendor.addressText,
                  commissionRatePct: Number(vendor.commissionRatePct),
                  logoUrl: vendor.logoUrl,
                  coverImageUrl: vendor.coverImageUrl,
                }}
              />
            </CardContent>
          </Card>

          {isRestaurant && vendor.restaurant && (
            <Card>
              <CardContent className="pt-5">
                <CardTitle className="mb-4">Opening hours</CardTitle>
                <AdminWeeklyHoursForm vendorId={vendor.id} defaults={vendor.restaurant.weeklyHours} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle>Recent orders ({stats.totalOrders} total)</CardTitle>
                <Package className="h-4 w-4 text-gray-400" aria-hidden />
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between rounded-control border border-border-brand p-3 text-sm hover:bg-brand-bg"
                    >
                      <div>
                        <p className="font-medium text-brand-dark">{o.orderNumber}</p>
                        <p className="text-xs text-gray-500">{o.customer.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-brand-dark">{formatBDT(o.total)}</p>
                        <Badge variant="outline">{o.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 pt-5">
              <CardTitle>Owner</CardTitle>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Name</dt>
                  <dd className="text-brand-dark">{vendor.user.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Phone</dt>
                  <dd className="text-brand-dark">{vendor.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="text-brand-dark">{vendor.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Address</dt>
                  <dd className="text-brand-dark">{vendor.addressText}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              <CardTitle>{isRestaurant ? "Menu" : "Catalog"}</CardTitle>
              <p className="text-sm text-brand-dark">
                {isRestaurant ? `${menuItemCount} menu item${menuItemCount === 1 ? "" : "s"}` : `${vendor._count.products} product${vendor._count.products === 1 ? "" : "s"}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              <CardTitle>Earnings & commission</CardTitle>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Commission rate</dt>
                  <dd><CommissionRateEditor vendorId={vendor.id} value={Number(vendor.commissionRatePct)} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Delivered revenue</dt>
                  <dd className="font-semibold text-brand-dark">{formatBDT(stats.revenue)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Commission earned (platform)</dt>
                  <dd className="font-semibold text-brand-dark">{formatBDT(stats.commissionPaid)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Vendor earnings</dt>
                  <dd className="font-semibold text-brand-dark">{formatBDT(stats.earnings)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Pending payout</dt>
                  <dd className="font-semibold text-brand-dark">{formatBDT(stats.pendingPayout)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {vendor.application && (
            <Card>
              <CardContent className="space-y-3 pt-5">
                <CardTitle>Documents</CardTitle>
                <div className="space-y-2 text-sm">
                  {vendor.application.tradeLicenseDocKey && (
                    <Link
                      href={`/admin/vendor-applications/${vendor.application.id}/documents/trade-license`}
                      target="_blank"
                      className="flex items-center gap-2 text-brand-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" aria-hidden />
                      Trade licence{vendor.application.tradeLicenseNo ? ` (${vendor.application.tradeLicenseNo})` : ""}
                    </Link>
                  )}
                  {vendor.application.nationalIdDocKey && (
                    <Link
                      href={`/admin/vendor-applications/${vendor.application.id}/documents/national-id`}
                      target="_blank"
                      className="flex items-center gap-2 text-brand-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" aria-hidden />
                      National ID{vendor.application.nationalIdNo ? ` (${vendor.application.nationalIdNo})` : ""}
                    </Link>
                  )}
                  {!vendor.application.tradeLicenseDocKey && !vendor.application.nationalIdDocKey && (
                    <p className="text-gray-500">No documents on file.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
