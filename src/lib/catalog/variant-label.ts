import type { AppLocale } from "@/lib/i18n/config";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Bengali numerals specifically for this label — the site doesn't use them
 * anywhere else (formatBDT always renders plain digits), so this stays
 * scoped to variant labels rather than becoming a site-wide convention. */
function toBengaliDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

// quantityValue is a Prisma Decimal, so it round-trips as a string like
// "1.000" — trim trailing zeros so it reads as "1" or "2.5", not "1.000".
function formatQuantity(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  return n % 1 === 0 ? String(n) : String(parseFloat(n.toFixed(3)));
}

const UNIT_WORD_EN: Record<string, (qty: number) => string> = {
  ML: () => "ml",
  L: () => "L",
  G: () => "g",
  KG: () => "kg",
  PCS: (qty) => (qty === 1 ? "pc" : "pcs"),
  PACK: () => "pack",
  DOZEN: () => "dozen",
};

const UNIT_WORD_BN: Record<string, string> = {
  ML: "মি.লি.",
  L: "লিটার",
  G: "গ্রাম",
  KG: "কেজি",
  PCS: "পিস",
  PACK: "প্যাক",
  DOZEN: "ডজন",
};

export type VariantForLabel = { quantityValue: number | string; unit: string; packCount: number };

/**
 * "300 ml", "2 x 300 ml" (or the Bengali equivalent, e.g. "২ x ৩০০ মি.লি.")
 * — the one place this label is ever computed, generated from quantityValue
 * + unit + packCount rather than stored as free text, so EN/BN never drift
 * out of sync with each other or with the underlying values.
 */
export function formatVariantLabel(variant: VariantForLabel, locale: AppLocale): string {
  const qtyNum = typeof variant.quantityValue === "number" ? variant.quantityValue : Number(variant.quantityValue);
  const qtyStr = formatQuantity(variant.quantityValue);

  if (locale === "bn") {
    const unitWord = UNIT_WORD_BN[variant.unit] ?? variant.unit;
    const size = `${toBengaliDigits(qtyStr)} ${unitWord}`;
    return variant.packCount > 1 ? `${toBengaliDigits(variant.packCount)} x ${size}` : size;
  }

  const unitWord = (UNIT_WORD_EN[variant.unit] ?? (() => variant.unit))(qtyNum);
  const size = `${qtyStr} ${unitWord}`;
  return variant.packCount > 1 ? `${variant.packCount} x ${size}` : size;
}

/** The vendor form's unit dropdown — same 7 options in every add/edit row. */
export const VARIANT_UNITS = ["ML", "L", "G", "KG", "PCS", "PACK", "DOZEN"] as const;

export const VARIANT_UNIT_FORM_LABEL: Record<string, string> = {
  ML: "ml",
  L: "L",
  G: "g",
  KG: "kg",
  PCS: "pcs",
  PACK: "pack",
  DOZEN: "dozen",
};

/** Quick "+ N pack" buttons in the vendor form. */
export const QUICK_PACK_COUNTS = [2, 4, 6] as const;
