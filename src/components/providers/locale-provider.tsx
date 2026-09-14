"use client";

import { createContext, useContext, useTransition } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { setLocaleAction } from "@/lib/i18n/actions";

type LocaleContextValue = {
  locale: AppLocale;
  dict: Dictionary;
  isChangingLocale: boolean;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: AppLocale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const [isChangingLocale, startTransition] = useTransition();

  const setLocale = (next: AppLocale) => {
    startTransition(() => {
      void setLocaleAction(next);
    });
  };

  return (
    <LocaleContext.Provider value={{ locale, dict, isChangingLocale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
