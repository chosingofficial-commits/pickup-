import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { publicEnv } from "@/lib/env/public";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number | string | { toString(): string }): string {
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${publicEnv.currencySymbol} ${formatted}`;
}

/**
 * Capitalizes the first letter of every word, lowercasing the rest first —
 * used for place names (service areas, neighbourhoods, towns) that come
 * from free-text admin entry and can't be trusted to already be correctly
 * cased (e.g. "khagrachari" entered instead of "Khagrachari").
 */
export function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
