import { MapPin, Search, Bike, PartyPopper } from "lucide-react";

const STEPS = [
  { icon: MapPin, title: "Set your location", body: "Tell us your area in Khagrachari Sadar so we can show what's deliverable to you." },
  { icon: Search, title: "Browse & order", body: "Pick groceries, essentials, or a restaurant meal and check out in a few taps." },
  { icon: Bike, title: "Track your rider", body: "Watch your order move from the shop to your door in real time." },
  { icon: PartyPopper, title: "Enjoy", body: "Pay on delivery or online, and enjoy — that's it." },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STEPS.map((step, i) => (
        <div key={step.title} className="flex flex-col items-start gap-2 rounded-card border border-border-brand bg-white p-4 shadow-soft">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
            <step.icon className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-xs font-semibold text-gray-400">Step {i + 1}</p>
          <h3 className="font-heading text-sm font-bold text-brand-dark">{step.title}</h3>
          <p className="text-xs text-gray-600">{step.body}</p>
        </div>
      ))}
    </div>
  );
}
