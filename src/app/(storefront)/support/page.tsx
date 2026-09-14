import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Support", description: "Get help with your Pick Up order, account, or business." };

export default async function SupportPage() {
  const user = await getCurrentUser();

  return (
    <Section title="Support" subtitle="Check our FAQ first, or send us a message and we'll get back to you.">
      <p className="mb-6 text-sm text-gray-600">
        Common questions about orders, delivery, and payments are answered on our{" "}
        <Link href="/faq" className="font-semibold text-brand-primary hover:underline">
          FAQ page
        </Link>
        .
      </p>
      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <SupportTicketForm defaultName={user?.name} defaultEmail={user?.email ?? ""} defaultPhone={user?.phone} />
        </CardContent>
      </Card>
    </Section>
  );
}
