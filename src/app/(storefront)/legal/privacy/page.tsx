import type { Metadata } from "next";
import { Section } from "@/components/ui/container";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <Section title="Privacy policy">
      <div className="prose mx-auto max-w-2xl text-sm text-gray-700">
        <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
          This is placeholder template content for development. Have a qualified lawyer review and finalize this
          policy — including any Bangladesh data-protection obligations — before Pick Up launches to real customers.
        </p>

        <h2 className="font-heading text-brand-dark">Information we collect</h2>
        <p>Account details (name, phone, email), delivery addresses, order history, and — with your permission — your device&apos;s location.</p>

        <h2 className="font-heading text-brand-dark">Location data</h2>
        <p>
          We ask for your location to show accurate delivery times and fees, and to let delivery riders share their
          live position with you during an active delivery. You can always enter your address manually instead of
          sharing your location. Rider location sharing stops automatically once a delivery is complete, cancelled,
          or fails, and location history is not kept indefinitely.
        </p>

        <h2 className="font-heading text-brand-dark">How we use your information</h2>
        <p>To process orders, calculate delivery fees, provide customer support, and improve the Pick Up service.</p>

        <h2 className="font-heading text-brand-dark">Sharing</h2>
        <p>
          We share only what&apos;s necessary with vendors and riders to fulfill your order (e.g. your delivery
          address and phone number). We do not sell your personal data.
        </p>

        <h2 className="font-heading text-brand-dark">Age-restricted products</h2>
        <p>
          Where enabled, we record age-verification confirmations at checkout and delivery-time compliance outcomes,
          without unnecessarily storing full copies of identity documents.
        </p>

        <h2 className="font-heading text-brand-dark">Your choices</h2>
        <p>You can update your account details, manage saved addresses, and contact support to request account deletion.</p>

        <h2 className="font-heading text-brand-dark">Contact</h2>
        <p>Questions about this policy can be sent through our contact page.</p>
      </div>
    </Section>
  );
}
