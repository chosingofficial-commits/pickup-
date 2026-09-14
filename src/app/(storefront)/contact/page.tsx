import type { Metadata } from "next";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { Section } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with the Pick Up team." };

export default async function ContactPage() {
  const [settings, user] = await Promise.all([getSiteSettings(), getCurrentUser()]);
  const whatsappDigits = settings[SITE_SETTING_KEYS.whatsappNumber].replace(/[^\d]/g, "");

  return (
    <Section title="Contact us" subtitle="We're happy to help with orders, vendor questions, or anything else.">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <a href={`tel:${settings[SITE_SETTING_KEYS.supportPhone]}`} className="flex items-center gap-2 text-brand-dark hover:text-brand-primary">
                <Phone className="h-4 w-4 text-brand-primary" aria-hidden />
                {settings[SITE_SETTING_KEYS.supportPhone]}
              </a>
              <a href={`mailto:${settings[SITE_SETTING_KEYS.supportEmail]}`} className="flex items-center gap-2 text-brand-dark hover:text-brand-primary">
                <Mail className="h-4 w-4 text-brand-primary" aria-hidden />
                {settings[SITE_SETTING_KEYS.supportEmail]}
              </a>
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand-dark hover:text-brand-primary"
              >
                <MessageCircle className="h-4 w-4 text-brand-primary" aria-hidden />
                Chat on WhatsApp
              </a>
              <p className="flex items-start gap-2 text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden />
                {settings[SITE_SETTING_KEYS.supportAddress]}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-5">
            <SupportTicketForm defaultName={user?.name} defaultEmail={user?.email ?? ""} defaultPhone={user?.phone} />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
