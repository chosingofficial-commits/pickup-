"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Live countdown shown to the customer while the vendor has hit "Wait" on their new order. */
export function WaitBanner({ waitUntil }: { waitUntil: string }) {
  const [remainingSec, setRemainingSec] = useState(() => Math.max(0, Math.round((new Date(waitUntil).getTime() - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingSec(Math.max(0, Math.round((new Date(waitUntil).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [waitUntil]);

  if (remainingSec <= 0) return null;

  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <Clock className="h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">The restaurant is experiencing a rush right now.</p>
        <p className="text-amber-800">
          They&apos;ll confirm your order shortly — please wait about {minutes}:{seconds.toString().padStart(2, "0")}.
        </p>
      </div>
    </div>
  );
}
