import type { Metadata } from "next";
import { setRiderApprovalAction } from "@/lib/actions/admin-riders";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Rider applications" };

export default async function AdminRiderApplicationsPage() {
  const riders = await db.riderProfile.findMany({
    where: { isApproved: false },
    include: { user: { select: { name: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Rider applications</h1>

      {riders.length === 0 ? (
        <p className="text-sm text-gray-500">No pending rider applications.</p>
      ) : (
        <div className="space-y-2">
          {riders.map((rider) => (
            <div key={rider.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{rider.user.name}</p>
                <p className="text-xs text-gray-500">
                  {rider.user.phone} · {rider.vehicleType ?? "No vehicle set"} · applied{" "}
                  {rider.user.createdAt.toLocaleDateString()}
                </p>
              </div>
              <form action={setRiderApprovalAction}>
                <input type="hidden" name="riderId" value={rider.id} />
                <input type="hidden" name="isApproved" value="1" />
                <button type="submit" className="rounded-control bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover">
                  Approve
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
