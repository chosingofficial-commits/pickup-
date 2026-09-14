import { Check, X } from "lucide-react";
import { getOrderFlow, statusLabel } from "@/lib/orders/status-flow";
import { cn } from "@/lib/utils";
import type { BusinessType, OrderStatus } from "@/generated/prisma/client";

const ALTERNATE_TERMINALS: OrderStatus[] = ["CANCELLED", "FAILED_DELIVERY", "RETURNED", "REFUNDED"];

export function DeliveryTimeline({
  businessType,
  currentStatus,
  history,
}: {
  businessType: BusinessType;
  currentStatus: OrderStatus;
  history: { status: OrderStatus; createdAt: Date }[];
}) {
  if (ALTERNATE_TERMINALS.includes(currentStatus)) {
    const entry = history.find((h) => h.status === currentStatus);
    return (
      <div className="flex items-center gap-3 rounded-card border border-red-200 bg-red-50 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <X className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-red-700">{statusLabel(currentStatus)}</p>
          {entry && (
            <p className="text-xs text-red-600">
              {entry.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
      </div>
    );
  }

  const flow = getOrderFlow(businessType);
  const currentIndex = flow.indexOf(currentStatus);

  return (
    <ol className="space-y-0">
      {flow.map((status, i) => {
        const isCurrent = i === currentIndex;
        const historyEntry = history.find((h) => h.status === status);
        const isReached = i <= currentIndex;

        return (
          <li key={status} className="relative flex gap-3 pb-6 last:pb-0">
            {i < flow.length - 1 && (
              <span className={cn("absolute left-[15px] top-8 h-full w-0.5", isReached && i < currentIndex ? "bg-brand-primary" : "bg-border-brand")} />
            )}
            <span
              className={cn(
                "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isReached ? "bg-brand-primary text-white" : "border border-border-brand bg-white text-gray-400",
              )}
            >
              {isReached ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", isCurrent ? "text-brand-dark" : isReached ? "text-brand-dark" : "text-gray-400")}>
                {statusLabel(status)}
              </p>
              {historyEntry && (
                <p className="text-xs text-gray-500">
                  {historyEntry.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
