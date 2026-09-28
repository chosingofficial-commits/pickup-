"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";

// Value stored is the versionKey of whichever offer was dismissed (not just
// "1") — so editing the amount or banner text in admin invalidates old
// dismissals and the banner reappears, instead of staying hidden forever.
const DISMISS_KEY = "pickup_announcement_dismissed_version";

function subscribe() {
  return () => {};
}
function readDismissedVersion(): string | null {
  try {
    return window.localStorage.getItem(DISMISS_KEY);
  } catch {
    // Storage can throw (e.g. Safari private browsing, blocked cookies) —
    // treat as "nothing dismissed" rather than crash the banner.
    return null;
  }
}
function getServerSnapshot() {
  return null;
}

export function AnnouncementBar({ message, versionKey }: { message: string; versionKey: string }) {
  const dismissedVersion = useSyncExternalStore(subscribe, readDismissedVersion, getServerSnapshot);
  const [manuallyDismissedVersion, setManuallyDismissedVersion] = useState<string | null>(null);

  const isDismissed = dismissedVersion === versionKey || manuallyDismissedVersion === versionKey;
  if (isDismissed) return null;

  return (
    <div className="relative bg-brand-primary px-8 py-1.5 text-center text-[11px] font-medium text-white md:px-4 md:py-2 md:text-sm">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          try {
            window.localStorage.setItem(DISMISS_KEY, versionKey);
          } catch {
            // Ignore — falls back to the in-memory dismissal below for this visit.
          }
          setManuallyDismissedVersion(versionKey);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-4 hover:bg-white/20 md:right-3 md:p-1"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
