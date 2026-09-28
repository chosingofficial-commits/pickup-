"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "pickup_announcement_dismissed_v1";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}
function getServerSnapshot() {
  return false;
}

export function AnnouncementBar({ message }: { message: string }) {
  const dismissedInStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);

  if (dismissedInStorage || manuallyDismissed) return null;

  return (
    <div className="relative bg-brand-primary px-8 py-1.5 text-center text-[11px] font-medium text-white md:px-4 md:py-2 md:text-sm">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, "1");
          setManuallyDismissed(true);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-4 hover:bg-white/20 md:right-3 md:p-1"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
