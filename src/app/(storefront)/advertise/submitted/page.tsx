import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Advertising request submitted" };

export default function AdvertiseSubmittedPage() {
  return (
    <Container className="flex flex-col items-center py-16 text-center">
      <CheckCircle2 className="h-14 w-14 text-brand-primary" aria-hidden />
      <h1 className="mt-4 font-heading text-2xl font-bold text-brand-dark">Request submitted!</h1>
      <p className="mt-2 max-w-md text-sm text-gray-600">
        Our team will review your advertisement for compliance and contact you about payment before it goes live.
      </p>
      <Link href="/" className="mt-6 rounded-control bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover">
        Back to Pick Up
      </Link>
    </Container>
  );
}
