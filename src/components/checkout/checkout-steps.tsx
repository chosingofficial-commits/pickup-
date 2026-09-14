import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "address", label: "Address" },
  { key: "schedule", label: "Schedule" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
] as const;

export function CheckoutSteps({ current }: { current: (typeof STEPS)[number]["key"] }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="mx-auto mb-8 flex max-w-lg items-center" aria-label="Checkout progress">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  isDone ? "bg-brand-primary text-white" : isCurrent ? "border-2 border-brand-primary text-brand-primary" : "border border-border-brand text-gray-400",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-[11px] font-medium", isCurrent ? "text-brand-dark" : "text-gray-400")}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={cn("mx-2 h-0.5 flex-1", isDone ? "bg-brand-primary" : "bg-border-brand")} />}
          </li>
        );
      })}
    </ol>
  );
}
