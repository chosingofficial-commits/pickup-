"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/**
 * Mobile-only compact alternative to the two-letter LanguageSwitcher pill:
 * a single button showing the OTHER language (tap to switch to it). Visually
 * small, but padded out to a 44x44 tap target. Desktop keeps the full
 * EN/BN pill (LanguageSwitcher) — see header.tsx.
 */
export function MobileLanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, isChangingLocale } = useLocale();
  const other = locale === "en" ? "bn" : "en";

  return (
    <button
      type="button"
      disabled={isChangingLocale}
      onClick={() => setLocale(other)}
      aria-label={other === "bn" ? "Switch to Bangla" : "Switch to English"}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-brand bg-white text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-bg disabled:opacity-60",
        className,
      )}
    >
      {other === "en" ? "EN" : "BN"}
    </button>
  );
}
