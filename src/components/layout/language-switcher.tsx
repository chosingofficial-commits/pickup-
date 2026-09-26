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
            "rounded-full px-2.5 py-1 transition-colors",
            locale === code ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
          )}
        >
          {code === "en" ? "EN" : "BN"}
        </button>
      ))}
    </div>
  );
}
