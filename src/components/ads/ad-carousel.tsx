"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdCard, type AdCardData } from "./ad-card";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 5000;

export function AdCarousel({ items }: { items: AdCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Track which card is centered/leading in the viewport, for the dots.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const trackRect = track.getBoundingClientRect();
        let closest = 0;
        let closestDist = Infinity;
        itemRefs.current.forEach((el, i) => {
          if (!el) return;
          const dist = Math.abs(el.getBoundingClientRect().left - trackRect.left);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActiveIndex(closest);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items.length]);

  // Auto-advance every ~5s, pausing on touch/hover and skipped entirely for
  // prefers-reduced-motion.
  useEffect(() => {
    if (items.length <= 1 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const nextIndex = (activeIndex + 1) % items.length;
      itemRefs.current[nextIndex]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [activeIndex, items.length, paused]);

  function scrollToIndex(index: number) {
    itemRefs.current[index]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  if (items.length === 0) return null;

  return (
    <div
      className="relative"
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((ad, i) => (
          <div
            key={ad.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
          >
            <AdCard ad={ad} />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous ad"
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            className="absolute -left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-border-brand bg-white p-1.5 shadow-soft hover:bg-brand-bg lg:flex"
          >
            <ChevronLeft className="h-4 w-4 text-brand-dark" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next ad"
            onClick={() => scrollToIndex(Math.min(items.length - 1, activeIndex + 1))}
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-border-brand bg-white p-1.5 shadow-soft hover:bg-brand-bg lg:flex"
          >
            <ChevronRight className="h-4 w-4 text-brand-dark" aria-hidden />
          </button>

          <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Ad carousel position">
            {items.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Go to ad ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={cn("h-1.5 rounded-full transition-all", i === activeIndex ? "w-5 bg-brand-primary" : "w-1.5 bg-border-brand")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
