import { Plus_Jakarta_Sans, Inter, Noto_Sans_Bengali } from "next/font/google";
import type { AppLocale } from "./i18n/config";

export const fontHeading = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const fontBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * The Bengali font (~108KB, by far the largest of the three) is only worth
 * loading when the page is actually rendered in Bengali — including its
 * variable class unconditionally made the browser fetch it on every request,
 * competing with render-blocking CSS for bandwidth on English pages that
 * never render Bengali script (currency is now the text "Tk", not the ৳
 * glyph, specifically so English pages have no Bengali-script characters
 * left at all). globals.css references var(--font-bengali) as a fallback;
 * when undefined it simply falls through to the next font in that chain
 * rather than erroring.
 */
export function getFontVariables(locale: AppLocale) {
  return locale === "bn"
    ? `${fontHeading.variable} ${fontBody.variable} ${fontBengali.variable}`
    : `${fontHeading.variable} ${fontBody.variable}`;
}
