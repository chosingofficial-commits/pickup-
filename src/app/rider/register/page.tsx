import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { RiderRegisterForm } from "@/components/rider/rider-register-form";

export const metadata: Metadata = { title: "Become a Pick Up rider" };

export default function RiderRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-md rounded-card border border-border-brand bg-white p-6 shadow-lifted sm:p-8">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Ride with Pick Up</h1>
        <p className="mt-1 text-sm text-gray-600">Create your rider account, then complete your profile to start accepting deliveries.</p>
        <div className="mt-6">
          <RiderRegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
