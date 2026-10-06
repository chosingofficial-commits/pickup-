import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { VendorApplicationWizard } from "@/components/vendor-application/vendor-application-wizard";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Register your business" };

export default async function VendorRegisterPage() {
  const user = await getCurrentUser();

  // Create account / log in right here, instead of redirecting to the main
  // domain's /register — on the vendor subdomain that'd either loop (no
  // logged-in session there) or, with separate logins, hit a login page the
  // visitor was never logged into. RegisterForm's own "next" handling and
  // its relative "Log in" link both resolve correctly on this same host.
  if (!user) {
    return (
      <div className="mx-auto max-w-md">
        <RegisterForm next="/vendor/register" />
      </div>
    );
  }

  const categories = await db.category.findMany({
    where: { parentId: null, isActive: true, isAgeRestricted: false },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Register your business</h1>
      <p className="mt-1 text-sm text-gray-600">List your grocery shop or restaurant on Pick Up and reach customers across Khagrachari Sadar.</p>
      <div className="mt-6">
        <VendorApplicationWizard categories={categories} defaults={{ name: user.name, email: user.email ?? "", phone: user.phone }} />
      </div>
    </div>
  );
}
