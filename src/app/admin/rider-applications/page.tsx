import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDuplicateNationalIdNumbers } from "@/lib/rider/queries";
import { RiderCard } from "@/components/admin/rider-card";

export const metadata: Metadata = { title: "Rider applications" };

export default async function AdminRiderApplicationsPage() {
  const [riders, duplicateNids] = await Promise.all([
    db.riderProfile.findMany({
      where: { isApproved: false },
      include: { user: { select: { name: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getDuplicateNationalIdNumbers(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Rider applications</h1>

      {riders.length === 0 ? (
        <p className="text-sm text-gray-500">No pending rider applications.</p>
      ) : (
        <div className="space-y-3">
          {riders.map((rider) => (
            <RiderCard
              key={rider.id}
              mode="pending"
              rider={{
                id: rider.id,
                name: rider.user.name,
                phone: rider.user.phone,
                vehicleType: rider.vehicleType,
                createdAt: rider.user.createdAt.toISOString(),
                hasNationalIdDoc: !!rider.nationalIdDocKey,
                nationalIdNo: rider.nationalIdNo,
                licenseCheckedInOffice: rider.licenseCheckedInOffice,
                photoCheckedInOffice: rider.photoCheckedInOffice,
                licenseNumber: rider.licenseNumber,
                adminNote: rider.adminNote,
                isDuplicateNid: !!rider.nationalIdNo && duplicateNids.has(rider.nationalIdNo),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
