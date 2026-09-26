import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { setRiderApprovalAction } from "@/lib/actions/admin-riders";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Riders" };

export default async function AdminRidersPage() {
  const riders = await db.riderProfile.findMany({
    where: { isApproved: true },
    include: { user: { select: { name: true, phone: true, createdAt: true } }, _count: { select: { deliveries: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Riders</h1>
      {riders.length === 0 ? (
        <p className="text-sm text-gray-500">No active riders yet.</p>
      ) : (
        <div className="space-y-2">
          {riders.map((rider) => (
            <div key={rider.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{rider.user.name}</p>
                <p className="text-xs text-gray-500">
                  {rider.user.phone} · {rider.vehicleType ?? "No vehicle set"} · {rider._count.deliveries} deliveries
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rider.isOnline ? "success" : "outline"}>{rider.isOnline ? "Online" : "Offline"}</Badge>
                <Badge variant="brand">Active</Badge>
                <form action={setRiderApprovalAction}>
                  <input type="hidden" name="riderId" value={rider.id} />
                  <input type="hidden" name="isApproved" value="0" />
                  <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                    Suspend
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
