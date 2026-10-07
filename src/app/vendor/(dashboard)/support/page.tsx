import type { Metadata } from "next";
import { SupportPanel } from "@/components/support/support-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Support" };

export default async function VendorSupportPage() {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return null;

  const tickets = await db.supportTicket.findMany({ where: { requesterId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Support</h1>
      <SupportPanel tickets={tickets} defaultName={user.name} defaultEmail={user.email ?? ""} defaultPhone={user.phone} />
    </div>
  );
}
