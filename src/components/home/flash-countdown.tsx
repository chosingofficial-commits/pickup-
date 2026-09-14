"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

// Asia/Dhaka has a fixed UTC+6 offset (no daylight saving), so this can be
// computed with plain UTC arithmetic instead of a timezone database lookup.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

function getEndOfDayDhaka(): Date {
  const shifted = new Date(Date.now() + DHAKA_OFFSET_MS);
  const endOfDayShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 23, 59, 59, 999);
  return new Date(endOfDayShifted - DHAKA_OFFSET_MS);
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function FlashCountdown() {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    const end = getEndOfDayDhaka();
    const tick = () => setRemaining(formatRemaining(end.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white">
      <Timer className="h-3.5 w-3.5" aria-hidden />
      Ends in {remaining ?? "--:--:--"}
    </span>
  );
}
