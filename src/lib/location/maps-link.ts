/** Google Maps directions link for a delivery address — coordinates when known, else a text search as a fallback. */
export function directionsUrl(input: { lat: { toString(): string } | null; lng: { toString(): string } | null; fallbackQuery: string }): string {
  if (input.lat != null && input.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${input.lat},${input.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.fallbackQuery)}`;
}
