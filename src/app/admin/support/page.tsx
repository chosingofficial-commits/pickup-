import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { TicketStatusSelect } from "@/components/admin/ticket-status-select";
import { replyToTicketAction } from "@/lib/actions/admin-support";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Support tickets" };

export default async function AdminSupportPage() {
  const tickets = await db.supportTicket.findMany({
    include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Support tickets</h1>
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-card border border-border-brand bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-brand-dark">{ticket.subject}</p>
                <p className="text-xs text-gray-500">
                  {ticket.name} · {ticket.email} · {ticket.category}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "brand" : "accent"}>{ticket.status}</Badge>
                <TicketStatusSelect ticketId={ticket.id} status={ticket.status} />
              </div>
            </div>

            <div className="mt-3 space-y-2 border-t border-border-brand pt-3">
              {ticket.messages.map((msg) => (
                <div key={msg.id} className={`rounded-control p-2.5 text-sm ${msg.author?.role === "ADMIN" ? "bg-brand-bg" : "bg-surface-muted"}`}>
                  <p className="text-xs font-semibold text-gray-500">{msg.author?.name ?? ticket.name}</p>
                  <p className="text-gray-700">{msg.message}</p>
                </div>
              ))}
            </div>

            <form action={replyToTicketAction} className="mt-3 flex gap-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input name="message" placeholder="Write a reply…" required className="h-9 flex-1 rounded-control border border-border-brand px-3 text-sm" />
              <button type="submit" className="rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover">
                Reply
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
