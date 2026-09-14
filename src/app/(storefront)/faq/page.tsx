import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Section } from "@/components/ui/container";

export const metadata: Metadata = { title: "FAQ", description: "Frequently asked questions about ordering, delivery, and payments on Pick Up." };

const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Ordering",
    items: [
      { q: "Where does Pick Up deliver?", a: "We currently deliver only within Khagrachari Sadar. If you're outside our coverage, you can join our waiting list from the coverage page and we'll notify you when we expand to your area." },
      { q: "How do I place an order?", a: "Browse groceries, essentials, or restaurants, add items to your cart, and check out with your delivery address, preferred time, and payment method." },
      { q: "Can I order from multiple shops at once?", a: "Yes — your cart can hold items from several vendors. Each vendor's items are delivered as a separate order with its own delivery fee." },
    ],
  },
  {
    category: "Delivery",
    items: [
      { q: "How long does delivery take?", a: "Most orders arrive within 15–40 minutes depending on your area and the vendor's preparation time." },
      { q: "Can I track my delivery?", a: "Yes — once a rider is assigned, you can see live delivery status and, where available, the rider's live location from your order details page." },
      { q: "What if a restaurant is closed?", a: "Closed restaurants can't accept immediate orders, but some allow scheduling for a later time — this is shown on the restaurant's page." },
    ],
  },
  {
    category: "Payments",
    items: [
      { q: "What payment methods are accepted?", a: "Cash on delivery, bKash, Nagad, Rocket, SSLCommerz, and debit/credit cards." },
      { q: "Is it safe to pay online?", a: "Yes. Payments are verified server-side and we never store your card or mobile banking PIN." },
      { q: "How do refunds work?", a: "You can request a refund from your order details page after delivery, cancellation, or a failed delivery. Our team reviews each request." },
    ],
  },
  {
    category: "Selling on Pick Up",
    items: [
      { q: "How do I register my shop or restaurant?", a: "Create an account, then apply from the \"Sell on Pick Up\" link. We review applications within 2–3 business days." },
      { q: "How much commission does Pick Up take?", a: "Pick Up charges a commission on each delivered order, shown in your vendor dashboard. Rates may vary by agreement." },
      { q: "How do I get paid?", a: "Request a payout anytime from your vendor dashboard once you have available earnings; our team processes payouts after review." },
    ],
  },
];

export default function FaqPage() {
  return (
    <Section title="Frequently asked questions">
      <div className="mx-auto max-w-2xl space-y-8">
        {FAQS.map((group) => (
          <div key={group.category}>
            <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark">{group.category}</h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <details key={item.q} className="group rounded-card border border-border-brand bg-white p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-brand-dark">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-sm text-gray-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
