import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import type { SupportTicket } from "@/generated/prisma/client";

/** Shared by the customer account area and the vendor/rider dashboards — the ticket list + new-request form are identical for every role. */
export function SupportPanel({
  tickets,
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  tickets: SupportTicket[];
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
}) {
  return (
    <div className="space-y-6">
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
          <SupportTicketForm defaultName={defaultName} defaultEmail={defaultEmail} defaultPhone={defaultPhone} />
        </CardContent>
      </Card>
    </div>
  );
}
