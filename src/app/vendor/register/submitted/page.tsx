import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Application submitted" };

export default function VendorApplicationSubmittedPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-brand-primary" aria-hidden />
      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-dark">Application submitted!</h1>
      <p className="mt-2 text-sm text-gray-600">
        Thanks for applying to sell on Pick Up. Our team will review your application, usually within 2–3 business days,
        and notify you by email and phone with the outcome.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-control bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
        Back to Pick Up
      </Link>
    </div>
  );
}
