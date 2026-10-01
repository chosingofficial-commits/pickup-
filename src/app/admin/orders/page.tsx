import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/orders/status-flow";
import { bdDateStringToUtcStart, bdDateStringToUtcEnd } from "@/lib/date/bd-time";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";
import type { Prisma, OrderStatus, PaymentProvider } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Orders" };

const ALL_STATUSES: OrderStatus[] = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
  "RETURNED",
  "REFUNDED",
];

const PAYMENT_METHODS: PaymentProvider[] = ["COD", "BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ", "CARD"];

const PAGE_SIZE = 25;

type SearchParams = { status?: string; paymentMethod?: string; from?: string; to?: string; q?: string; page?: string };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { status, paymentMethod, from, to, q, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (status && status !== "ALL") where.status = status as OrderStatus;
  if (paymentMethod && paymentMethod !== "ALL") where.orderGroup = { payment: { provider: paymentMethod as PaymentProvider } };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: bdDateStringToUtcStart(from) } : {}),
      ...(to ? { lte: bdDateStringToUtcEnd(to) } : {}),
    };
  }
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [{ orderNumber: { contains: term, mode: "insensitive" } }, { customer: { phone: { contains: term } } }];
  }

  const [orders, totalCount] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        vendor: { select: { businessName: true } },
        customer: { select: { name: true } },
        orderGroup: { select: { payment: { select: { provider: true, status: true, isSandbox: true } } } },
        delivery: { select: { rider: { select: { user: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const query = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { status, paymentMethod, from, to, q, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, String(value));
    }
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Orders</h1>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-card border border-border-brand bg-white p-4">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-semibold text-brand-dark">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Order number or customer phone"
            className="h-9 w-56 rounded-control border border-border-brand px-2.5 text-xs"
          />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-semibold text-brand-dark">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? "ALL"} className="h-9 rounded-control border border-border-brand px-2.5 text-xs">
            <option value="ALL">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="paymentMethod" className="mb-1 block text-xs font-semibold text-brand-dark">
            Payment method
          </label>
          <select id="paymentMethod" name="paymentMethod" defaultValue={paymentMethod ?? "ALL"} className="h-9 rounded-control border border-border-brand px-2.5 text-xs">
            <option value="ALL">All</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-semibold text-brand-dark">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from ?? ""} className="h-9 rounded-control border border-border-brand px-2.5 text-xs" />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-semibold text-brand-dark">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to ?? ""} className="h-9 rounded-control border border-border-brand px-2.5 text-xs" />
        </div>
        <button type="submit" className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">
          Filter
        </button>
        {(status || paymentMethod || from || to || q) && (
          <Link href="/admin/orders" className="h-9 rounded-control border border-border-brand px-4 text-xs font-semibold leading-9 text-brand-dark hover:bg-brand-bg">
            Clear
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders match these filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-border-brand bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-border-brand bg-surface-muted text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rider</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const payment = order.orderGroup.payment;
                  return (
                    <tr key={order.id} className="border-b border-border-brand last:border-0 hover:bg-brand-bg">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-gray-600">{order.vendor.businessName}</td>
                      <td className="px-4 py-3 text-gray-600">{order.customer.name}</td>
                      <td className="px-4 py-3 font-semibold text-brand-dark">{formatBDT(order.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                          <span>{payment?.provider === "COD" || !payment ? "COD" : payment.provider}</span>
                          {payment?.isSandbox && <Badge variant="warning">Sandbox</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={order.status === "DELIVERED" ? "brand" : "accent"}>{statusLabel(order.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.delivery?.rider?.user.name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {totalCount} order{totalCount === 1 ? "" : "s"} · page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Link
                href={query({ page: String(Math.max(1, page - 1)) })}
                aria-disabled={page <= 1}
                className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${page <= 1 ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
              >
                Previous
              </Link>
              <Link
                href={query({ page: String(Math.min(totalPages, page + 1)) })}
                aria-disabled={page >= totalPages}
                className={`rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold ${page >= totalPages ? "pointer-events-none text-gray-300" : "text-brand-dark hover:bg-brand-bg"}`}
              >
                Next
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
