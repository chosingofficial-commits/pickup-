import { getActiveServiceAreaLabel } from "@/lib/location/queries";

export async function DeliveryBanner() {
  const areaLabel = await getActiveServiceAreaLabel();
  if (!areaLabel) return null;

  return (
    <div className="bg-brand-dark px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      Now delivering in {areaLabel} · আপনার প্রয়োজন, দ্রুত ডেলিভারি
    </div>
  );
}
