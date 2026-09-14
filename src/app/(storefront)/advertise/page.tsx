import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { AdvertisementRequestForm } from "@/components/advertise/advertisement-request-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Advertise on Pick Up" };

export default async function AdvertisePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advertise");

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-2xl font-bold text-brand-dark">Advertise on Pick Up</h1>
        <p className="mt-1 text-sm text-gray-600">
          Reach customers across Khagrachari Sadar with a sponsored banner. All advertisements are reviewed and require
          payment before going live — submitting a request does not publish it automatically.
        </p>
        <Card className="mt-6">
          <CardContent className="pt-5">
            <AdvertisementRequestForm defaults={{ name: user.name, email: user.email ?? "", phone: user.phone }} />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
