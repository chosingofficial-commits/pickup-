/**
 * The ONE standard plain white packet image every tobacco product shows —
 * no vendor photos, no branding, no product-specific imagery. Built as CSS
 * (not an uploaded asset) so it's genuinely impossible for any particular
 * product to look more appealing than another; every cigarette/smoking
 * accessory on the site renders exactly this, varying only in the pack
 * size text.
 */
export function PlainPackImage({ packSize }: { packSize: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 border border-gray-300 bg-white p-3 text-center">
      <span className="rounded-sm border border-red-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">18+</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-800">{packSize}</span>
      <span className="text-[9px] leading-tight text-gray-600">Smoking is injurious to health</span>
    </div>
  );
}
