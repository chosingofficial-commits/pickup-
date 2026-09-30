"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProductGalleryImage = { id: string; url: string };

const SWIPE_THRESHOLD_PX = 40;

// Next's image optimizer flatly refuses http:// origins — never hit in
// production (real object storage is always https), but the local
// filesystem fallback storage adapter used in dev returns an http://
// localhost URL, so skip optimization for exactly that shape (see AdCard
// for the same workaround, used for the same reason).
function isUnoptimizable(url: string): boolean {
  return url.startsWith("http://");
}

/**
 * The whole product-page photo experience: a main image (never cropped —
 * object-contain on a neutral background, since object-cover was clipping
 * text/edges off photos), a thumbnail strip, and a full-screen lightbox.
 * Swipe works both on the inline main image and inside the lightbox; the
 * lightbox's own <Image> only mounts once opened, so the full-size photo is
 * never fetched until then — the main/thumbnail images request much smaller
 * sizes via their `sizes` prop, keeping the initial product-page load fast.
 */
export function ProductGallery({ images, productName }: { images: ProductGalleryImage[]; productName: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const hasMultiple = count > 1;

  const goTo = useCallback((index: number) => setSelectedIndex(Math.max(0, Math.min(count - 1, index))), [count]);
  const goToWrapped = useCallback((delta: number) => setSelectedIndex((i) => (i + delta + count) % count), [count]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEndInline(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(selectedIndex + (delta < 0 ? 1 : -1));
  }
  function handleTouchEndLightbox(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goToWrapped(delta < 0 ? 1 : -1);
  }

  // Keyboard nav + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowRight") goToWrapped(1);
      else if (e.key === "ArrowLeft") goToWrapped(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, goToWrapped]);

  if (count === 0) {
    return <div className="aspect-square w-full rounded-card bg-surface-muted" />;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEndInline}
        className="relative block aspect-square w-full overflow-hidden rounded-card bg-surface-muted"
        aria-label={`View full-size photo, image ${selectedIndex + 1} of ${count}`}
      >
        <Image
          src={images[selectedIndex].url}
          alt={productName}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
          unoptimized={isUnoptimizable(images[selectedIndex].url)}
        />
      </button>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible" role="tablist" aria-label="Product photos">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === selectedIndex}
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-control bg-surface-muted ring-2 ring-offset-1 sm:w-20",
                i === selectedIndex ? "ring-brand-primary" : "ring-transparent hover:ring-border-brand",
              )}
            >
              <Image
                src={img.url}
                alt={`${productName} thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-contain"
                unoptimized={isUnoptimizable(img.url)}
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} photo viewer`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEndLightbox}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:right-5 sm:top-5"
            autoFocus
          >
            <X className="h-6 w-6" aria-hidden />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => goToWrapped(-1)}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:left-5"
              >
                <ChevronLeft className="h-7 w-7" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => goToWrapped(1)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 sm:right-5"
              >
                <ChevronRight className="h-7 w-7" aria-hidden />
              </button>
            </>
          )}

          <div className="relative h-full w-full">
            <Image
              src={images[selectedIndex].url}
              alt={`${productName}, image ${selectedIndex + 1} of ${count}`}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized={isUnoptimizable(images[selectedIndex].url)}
            />
          </div>

          {hasMultiple && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
              Image {selectedIndex + 1} of {count}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
