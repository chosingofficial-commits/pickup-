import { z } from "zod";

/** Bangladeshi mobile numbers: 01[3-9]XXXXXXXX, optionally with +88 or 88 prefix. */
const BD_PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export function normalizeBdPhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  const local = digits.startsWith("88") ? digits.slice(2) : digits;
  return `+88${local}`;
}

export const bdPhoneSchema = z
  .string()
  .trim()
  .refine((v) => BD_PHONE_RE.test(v), {
    message: "Enter a valid Bangladeshi mobile number, e.g. 01712345678",
  })
  .transform(normalizeBdPhone);
