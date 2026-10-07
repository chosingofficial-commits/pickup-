"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { submitAdvertisementRequestAction } from "@/lib/actions/advertisement";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { AdCard } from "@/components/ads/ad-card";
import { bdDateRangeDays } from "@/lib/date/bd-time";
import { cheapestAdPrice, formatAdPriceBreakdown } from "@/lib/ads/pricing";
import { countOverlapping } from "@/lib/ads/availability";
import { formatBDT } from "@/lib/utils";

export type PlacementOption = {
  code: string;
  name: string;
  dailyPrice: number;
  weeklyPrice: number;
  monthlyPrice: number;
  maxConcurrentAds: number;
  bookedRanges: { start: string; end: string }[];
};

export function AdvertisementRequestForm({
  defaults,
  placements,
}: {
  defaults: { phone: string; businessName?: string };
  placements: PlacementOption[];
}) {
  const [state, formAction] = useActionState(submitAdvertisementRequestAction, initialActionState);

  const [businessName, setBusinessName] = useState(defaults.businessName ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [placementCode, setPlacementCode] = useState(placements[0]?.code ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedPlacement = placements.find((p) => p.code === placementCode);
  const days = startDate && endDate && endDate > startDate ? bdDateRangeDays(startDate, endDate) : 0;
  const estimate = useMemo(
    () =>
      selectedPlacement && days > 0
        ? cheapestAdPrice(days, { daily: selectedPlacement.dailyPrice, weekly: selectedPlacement.weeklyPrice, monthly: selectedPlacement.monthlyPrice })
        : null,
    [selectedPlacement, days],
  );

  // Advisory only — the real capacity gate is enforced admin-side when the
  // campaign is actually created, since more requests could come in between
  // now and then. This just avoids surprising a business that's about to pay.
  const isFull =
    !!selectedPlacement &&
    days > 0 &&
    countOverlapping(selectedPlacement.bookedRanges, startDate, endDate) >= selectedPlacement.maxConcurrentAds;
  const alternativePlacementNames = placements.filter((p) => p.code !== placementCode).map((p) => p.name);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form action={formAction} className="space-y-4" noValidate>
        {state.status === "error" && state.message && (
          <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <div>
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            name="businessName"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            aria-invalid={!!state.fieldErrors?.businessName}
          />
          <FieldError>{state.fieldErrors?.businessName?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="phone">Contact phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} required aria-invalid={!!state.fieldErrors?.phone} />
          <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="targetUrl">Link (your website, page, or WhatsApp/Facebook link)</Label>
          <Input id="targetUrl" name="targetUrl" type="url" placeholder="https://" required aria-invalid={!!state.fieldErrors?.targetUrl} />
          <FieldError>{state.fieldErrors?.targetUrl?.[0]}</FieldError>
        </div>

        <FileUploadField
          name="pendingBannerImageKey"
          label="Ad image"
          folder="ad-pending"
          required
          hint="Recommended 1200×600px, 2:1 ratio · JPEG, PNG, or WebP · max 5MB"
          onPreviewChange={setBannerImageUrl}
        />
        <FieldError>{state.fieldErrors?.pendingBannerImageKey?.[0]}</FieldError>

        <div>
          <Label htmlFor="placementCode">Placement</Label>
          <Select id="placementCode" name="placementCode" value={placementCode} onChange={(e) => setPlacementCode(e.target.value)}>
            {placements.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} — {formatBDT(p.dailyPrice)}/day
              </option>
            ))}
          </Select>
          <FieldError>{state.fieldErrors?.placementCode?.[0]}</FieldError>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startDate">Start date (Bangladesh time)</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-invalid={!!state.fieldErrors?.startDate}
            />
            <FieldError>{state.fieldErrors?.startDate?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="endDate">End date (Bangladesh time)</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-invalid={!!state.fieldErrors?.endDate}
            />
            <FieldError>{state.fieldErrors?.endDate?.[0]}</FieldError>
          </div>
        </div>

        {isFull && (
          <p role="alert" className="rounded-control bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            These dates are fully booked for {selectedPlacement!.name}.{" "}
            {alternativePlacementNames.length > 0
              ? `Try other dates or ${alternativePlacementNames.join(" or ")}.`
              : "Try other dates."}
          </p>
        )}

        <div className="rounded-control bg-brand-bg px-4 py-3 text-sm">
          <span className="text-gray-600">Estimated total: </span>
          <span className="font-semibold text-brand-dark">
            {estimate ? `${formatBDT(estimate.total)} (${formatAdPriceBreakdown(estimate)})` : "Choose your dates above"}
          </span>
          <p className="mt-0.5 text-xs text-gray-500">Uses the cheapest combination of monthly, weekly, and daily rates. Our team will confirm the final price when your ad is approved.</p>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="agreementAccepted" value="1" required className="mt-0.5" />
          I confirm this advertisement complies with Pick Up&apos;s advertising policy (no illegal, deceptive, adult, gambling,
          tobacco, or nicotine content) and agree to be charged upon approval.
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="ownsContent" value="1" required className="mt-0.5" />
          I own or have permission to use this image and its content.
        </label>

        <SubmitButton className="w-auto px-6">Submit advertising request</SubmitButton>
      </form>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</p>
        <AdCard ad={{ title: businessName || "Your business", imageUrl: bannerImageUrl ?? "", advertiserName: businessName || "Your business name" }} />
        <p className="mt-2 text-xs text-gray-500">This is how your ad will appear to customers.</p>
      </div>
    </div>
  );
}
