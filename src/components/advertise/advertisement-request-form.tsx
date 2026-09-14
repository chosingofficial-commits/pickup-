"use client";

import { useActionState } from "react";
import { submitAdvertisementRequestAction } from "@/lib/actions/advertisement";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";

const PLACEMENTS = [
  { value: "HERO_BANNER", label: "Main hero banner" },
  { value: "BELOW_CATEGORIES_BANNER", label: "Banner below categories" },
  { value: "BETWEEN_SECTIONS_BANNER", label: "Banner between sections" },
  { value: "RESTAURANT_PROMO_BANNER", label: "Restaurant promotional banner" },
  { value: "SIDEBAR_BANNER", label: "Sidebar banner (desktop)" },
  { value: "MOBILE_PROMO_CARD", label: "Mobile promotional card" },
  { value: "SPONSORED_VENDOR", label: "Sponsored vendor placement" },
  { value: "SPONSORED_RESTAURANT", label: "Sponsored restaurant placement" },
];

export function AdvertisementRequestForm({ defaults }: { defaults: { name: string; email: string; phone: string } }) {
  const [state, formAction] = useActionState(submitAdvertisementRequestAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="advertiserName">Your name</Label>
          <Input id="advertiserName" name="advertiserName" defaultValue={defaults.name} required aria-invalid={!!state.fieldErrors?.advertiserName} />
          <FieldError>{state.fieldErrors?.advertiserName?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" required aria-invalid={!!state.fieldErrors?.businessName} />
          <FieldError>{state.fieldErrors?.businessName?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone} required aria-invalid={!!state.fieldErrors?.phone} />
          <FieldError>{state.fieldErrors?.phone?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults.email} required aria-invalid={!!state.fieldErrors?.email} />
          <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Advertisement title</Label>
        <Input id="title" name="title" required aria-invalid={!!state.fieldErrors?.title} />
        <FieldError>{state.fieldErrors?.title?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="description">Advertisement description</Label>
        <Textarea id="description" name="description" rows={3} required aria-invalid={!!state.fieldErrors?.description} />
        <FieldError>{state.fieldErrors?.description?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="targetUrl">Target URL</Label>
        <Input id="targetUrl" name="targetUrl" type="url" placeholder="https://" required aria-invalid={!!state.fieldErrors?.targetUrl} />
        <FieldError>{state.fieldErrors?.targetUrl?.[0]}</FieldError>
      </div>

      <FileUploadField name="bannerImageUrl" label="Banner image" folder="ads" required hint="Recommended 1200×400 (desktop) / 600×400 (mobile)" />
      <FieldError>{state.fieldErrors?.bannerImageUrl?.[0]}</FieldError>

      <div>
        <Label htmlFor="preferredPlacementCode">Preferred placement</Label>
        <Select id="preferredPlacementCode" name="preferredPlacementCode" defaultValue="HERO_BANNER">
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Campaign start date</Label>
          <Input id="startDate" name="startDate" type="date" required aria-invalid={!!state.fieldErrors?.startDate} />
          <FieldError>{state.fieldErrors?.startDate?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="endDate">Campaign end date</Label>
          <Input id="endDate" name="endDate" type="date" required aria-invalid={!!state.fieldErrors?.endDate} />
          <FieldError>{state.fieldErrors?.endDate?.[0]}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="budget">Advertising budget (৳)</Label>
          <Input id="budget" name="budget" type="number" min="0" step="0.01" required aria-invalid={!!state.fieldErrors?.budget} />
          <FieldError>{state.fieldErrors?.budget?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="paymentMethod">Payment method</Label>
          <Select id="paymentMethod" name="paymentMethod" defaultValue="SSLCOMMERZ">
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="ROCKET">Rocket</option>
            <option value="SSLCOMMERZ">SSLCommerz</option>
            <option value="CARD">Card</option>
          </Select>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" name="agreementAccepted" value="1" required className="mt-0.5" />
        I confirm this advertisement complies with Pick Up&apos;s advertising policy (no illegal, deceptive, adult,
        gambling, tobacco, or nicotine content) and agree to be charged upon approval.
      </label>

      <SubmitButton className="w-auto px-6">Submit advertising request</SubmitButton>
    </form>
  );
}
