"use client";

import { useActionState } from "react";
import { updateSiteSettingsAction } from "@/lib/actions/admin-settings";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FileUploadField } from "@/components/forms/file-upload-field";

export function SiteSettingsForm({ defaults }: { defaults: Record<string, string> }) {
  const [state, formAction] = useActionState(updateSiteSettingsAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="supportPhone">Support phone</Label>
          <Input id="supportPhone" name="supportPhone" defaultValue={defaults.support_phone} />
        </div>
        <div>
          <Label htmlFor="supportEmail">Support email</Label>
          <Input id="supportEmail" name="supportEmail" type="email" defaultValue={defaults.support_email} />
        </div>
        <div>
          <Label htmlFor="whatsappNumber">WhatsApp number</Label>
          <Input id="whatsappNumber" name="whatsappNumber" defaultValue={defaults.whatsapp_number} />
        </div>
        <div>
          <Label htmlFor="freeDeliveryThreshold">Free delivery threshold (Tk)</Label>
          <Input id="freeDeliveryThreshold" name="freeDeliveryThreshold" type="number" min="0" defaultValue={defaults.free_delivery_threshold} />
        </div>
        <div>
          <Label htmlFor="defaultCommissionRatePct">Default commission rate (%)</Label>
          <Input id="defaultCommissionRatePct" name="defaultCommissionRatePct" type="number" min="0" max="100" step="0.5" defaultValue={defaults.default_commission_rate_pct} />
        </div>
        <div>
          <Label htmlFor="vatRatePct">VAT rate (%)</Label>
          <Input id="vatRatePct" name="vatRatePct" type="number" min="0" max="100" step="0.5" defaultValue={defaults.vat_rate_pct} />
        </div>
        <div>
          <Label htmlFor="defaultRiderCommissionRatePct">Default rider commission rate (%)</Label>
          <Input
            id="defaultRiderCommissionRatePct"
            name="defaultRiderCommissionRatePct"
            type="number"
            min="0"
            max="100"
            step="0.5"
            defaultValue={defaults.default_rider_commission_rate_pct}
          />
          <p className="mt-1 text-xs text-gray-500">Applied to new riders. Each rider&apos;s individual rate can be changed later on their profile.</p>
        </div>
      </div>
      <div>
        <Label htmlFor="supportAddress">Support address</Label>
        <Textarea id="supportAddress" name="supportAddress" rows={2} defaultValue={defaults.support_address} />
      </div>
      <FileUploadField
        name="heroImageUrl"
        label="Homepage hero photo"
        folder="hero"
        defaultUrl={defaults.hero_image_url}
        hint="Replaces the default scooter graphic on the homepage. JPEG, PNG, or WebP."
      />
      <SubmitButton className="w-auto px-6">Save settings</SubmitButton>
    </form>
  );
}
