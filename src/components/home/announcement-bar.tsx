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
    <div className="relative bg-brand-primary px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, "1");
          setManuallyDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-white/20"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
