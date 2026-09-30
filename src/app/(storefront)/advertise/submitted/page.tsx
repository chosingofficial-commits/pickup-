import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";

export const metadata: Metadata = { title: "Advertising request submitted" };

export default async function AdvertiseSubmittedPage() {
  const settings = await getSiteSettings();

  return (
    <Container className="flex flex-col items-center py-16 text-center">
      <CheckCircle2 className="h-14 w-14 text-brand-primary" aria-hidden />
      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-dark">Request submitted!</h1>
      <p className="mt-2 max-w-md text-sm text-gray-600">
        Our team will review your advertisement for compliance and contact you before it goes live.
      </p>
      <div className="mt-4 max-w-md rounded-control bg-brand-bg px-4 py-3 text-sm text-brand-dark">
        {settings[SITE_SETTING_KEYS.adPaymentInstructions]}
      </div>
      <div className="mt-6 flex gap-3">
        <Link href="/account/ads" className="rounded-control bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
          View my ads
        </Link>
        <Link href="/" className="rounded-control border border-border-brand px-6 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-bg">
          Back to Pick Up
        </Link>
      </div>
    </Container>
  );
}
