"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Swipeable row (mobile) with desktop arrow buttons — same scroll-snap
 * technique as AdCarousel, simplified: no autoplay/dot-indicators, just
 * "scroll by one viewport's worth" on each arrow click, which is all a
 * browsing row like this needs.
 */
export function HorizontalShopRail({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute -left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-border-brand bg-white p-1.5 shadow-soft hover:bg-brand-bg lg:flex"
      >
        <ChevronLeft className="h-4 w-4 text-brand-dark" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-border-brand bg-white p-1.5 shadow-soft hover:bg-brand-bg lg:flex"
      >
        <ChevronRight className="h-4 w-4 text-brand-dark" aria-hidden />
      </button>
    </div>
  );
}
