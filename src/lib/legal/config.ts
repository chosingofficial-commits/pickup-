/**
 * Values the Terms/Privacy pages need but don't have yet (registered
 * business name, trade licence number, a real "last updated" date once the
 * documents have had a lawyer's sign-off). Each is null until filled in —
 * the pages below must hide the sentence/line that depends on a null value
 * rather than showing a "[TO FILL IN]" placeholder to customers. Fill these
 * in directly once the real values are available.
 */
export const LEGAL_INFO = {
  registeredBusinessName: "Pick Up (pickupn.com)" as string | null,
  tradeLicenceNumber: null as string | null,
  lastUpdated: "October 11, 2026" as string | null,
};
