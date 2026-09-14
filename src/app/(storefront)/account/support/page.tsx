import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Support" };

export default async function AccountSupportPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tickets = await db.supportTicket.findMany({
    where: { requesterId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Support</h1>

      {tickets.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <CardTitle className="mb-3">Your requests</CardTitle>
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-control border border-border-brand p-3 text-sm">
                  <div>
                    <p className="font-medium text-brand-dark">{t.subject}</p>
                    <p className="text-xs text-gray-500">{t.category}</p>
                  </div>
                  <Badge variant={t.status === "RESOLVED" || t.status === "CLOSED" ? "brand" : "accent"}>{t.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">New support request</CardTitle>
          <SupportTicketForm defaultName={user.name} defaultEmail={user.email ?? ""} defaultPhone={user.phone} />
        </CardContent>
      </Card>
    </div>
  );
}
