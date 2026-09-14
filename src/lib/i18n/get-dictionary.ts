import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isAppLocale, type AppLocale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import bn from "./dictionaries/bn";

const dictionaries: Record<AppLocale, Dictionary> = { en, bn };

export async function getLocale(): Promise<AppLocale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE_NAME)?.value;
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{ locale: AppLocale; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: dictionaries[locale] };
}

export function dictionaryFor(locale: AppLocale): Dictionary {
  return dictionaries[locale];
}

/** Simple `{placeholder}` interpolation for dictionary strings. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
