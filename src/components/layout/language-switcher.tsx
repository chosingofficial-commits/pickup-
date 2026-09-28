"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, isChangingLocale } = useLocale();

  return (
    <div
      className={cn("inline-flex items-center rounded-full border border-border-brand bg-white p-0.5 text-xs font-semibold", className)}
      role="group"
      aria-label="Language"
    >
      {(["en", "bn"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={isChangingLocale}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            // Padding-only sizing (~44px tap target) so display stays the
            // browser's default inline-block at every breakpoint, exactly as
            // before — md: restores the original padding untouched.
            "rounded-full px-3.5 py-3.5 transition-colors md:px-2.5 md:py-1",
            locale === code ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
          )}
        >
          {code === "en" ? "EN" : "BN"}
        </button>
      ))}
    </div>
  );
}
