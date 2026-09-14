import type { Metadata } from "next";
import { Section } from "@/components/ui/container";
import { Truck, ShieldCheck, Store, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About Pick Up",
  description: "Pick Up is Khagrachari Sadar's marketplace for groceries, everyday essentials, and restaurant food.",
};

const VALUES = [
  { icon: Truck, title: "Fast, local delivery", body: "We focus deeply on one town at a time so every delivery is quick and reliable." },
  { icon: Store, title: "Real local businesses", body: "Every shop and restaurant on Pick Up is a verified business from Khagrachari Sadar." },
  { icon: ShieldCheck, title: "Trust & safety", body: "Secure payments, verified vendors, and clear delivery tracking on every order." },
  { icon: Users, title: "Built for the community", body: "Pick Up exists to help local shops reach more customers and customers save time." },
];

export default function AboutPage() {
  return (
    <Section title="About Pick Up" subtitle="Everything you need, delivered fast — starting right here in Khagrachari Sadar.">
      <div className="prose max-w-2xl text-sm text-gray-700">
        <p>
          Pick Up is a multi-vendor marketplace built for Bangladesh, starting with Khagrachari Sadar. We connect
          customers with local grocery shops, everyday essentials retailers, and restaurants — all in one place, with
          fast delivery and secure payments.
        </p>
        <p>
          We&apos;re starting small and local on purpose. By focusing on one town first, we can guarantee fast delivery
          times and close relationships with every vendor and rider on the platform. As we grow, we plan to expand to
          new upazilas, districts, and divisions across Bangladesh.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-card border border-border-brand bg-white p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
              <v.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-3 font-heading text-sm font-bold text-brand-dark">{v.title}</h3>
            <p className="mt-1 text-xs text-gray-600">{v.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
