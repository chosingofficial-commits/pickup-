import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { toggleCustomerActiveAction } from "@/lib/actions/admin-customers";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Customers</h1>

      <form method="GET" className="max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or phone"
          className="h-10 w-full rounded-control border border-border-brand px-3 text-sm"
        />
      </form>

      <div className="space-y-2">
        {customers.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-card border border-border-brand bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-brand-dark">{c.name}</p>
              <p className="text-xs text-gray-500">
                {c.phone} · {c._count.orders} orders · Joined {c.createdAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.isActive ? "brand" : "danger"}>{c.isActive ? "Active" : "Deactivated"}</Badge>
              <form action={toggleCustomerActiveAction}>
                <input type="hidden" name="userId" value={c.id} />
                <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                  {c.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
