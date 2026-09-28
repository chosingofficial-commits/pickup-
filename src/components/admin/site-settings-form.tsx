"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateSiteSettingsAction } from "@/lib/actions/admin-settings";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FileUploadField } from "@/components/forms/file-upload-field";

/** Same `{amount}` substitution as lib/i18n/get-dictionary.ts's t() — duplicated
 * here since that module is server-only and can't be imported into this client form. */
function previewText(template: string, amount: string): string {
  return template.replace(/\{amount\}/g, amount || "{amount}");
}

export function SiteSettingsForm({ defaults }: { defaults: Record<string, string> }) {
  const [state, formAction] = useActionState(updateSiteSettingsAction, initialActionState);

  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState(defaults.free_delivery_threshold ?? "500");
  const [freeDeliveryEn, setFreeDeliveryEn] = useState(defaults.free_delivery_banner_text_en ?? "");
  const [freeDeliveryBn, setFreeDeliveryBn] = useState(defaults.free_delivery_banner_text_bn ?? "");
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(defaults.free_delivery_promo_enabled !== "0");

  const [allOrdersAmount, setAllOrdersAmount] = useState(defaults.all_orders_free_delivery_threshold ?? "500");
  const [allOrdersEn, setAllOrdersEn] = useState(defaults.all_orders_banner_text_en ?? "");
  const [allOrdersBn, setAllOrdersBn] = useState(defaults.all_orders_banner_text_bn ?? "");
  // Default OFF, unlike the first-order offer — this replaces the old
  // per-zone rule, which an owner may not want live again immediately.
  const [allOrdersEnabled, setAllOrdersEnabled] = useState(defaults.all_orders_free_delivery_enabled === "1");

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && <p className="text-sm text-brand-primary">{state.message}</p>}
      {state.status === "error" && state.message && <p className="text-sm text-red-600">{state.message}</p>}

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

      <div className="space-y-3 rounded-control border border-border-brand p-4">
        <h3 className="font-heading text-sm font-bold text-brand-dark">First-order free delivery offer</h3>

        <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
          <input
            type="checkbox"
            name="freeDeliveryPromoEnabled"
            value="1"
            checked={freeDeliveryEnabled}
            onChange={(e) => setFreeDeliveryEnabled(e.target.checked)}
          />
          Show the offer and apply it at checkout
        </label>

        <div className="max-w-xs">
          <Label htmlFor="freeDeliveryThreshold">Minimum order amount (Tk)</Label>
          <Input
            id="freeDeliveryThreshold"
            name="freeDeliveryThreshold"
            type="number"
            min="1"
            max="100000"
            step="1"
            value={freeDeliveryAmount}
            onChange={(e) => setFreeDeliveryAmount(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-gray-500">A customer&apos;s first order must reach this amount (Tk) to qualify.</p>
        </div>

        <div>
          <Label htmlFor="freeDeliveryBannerTextEn">Banner text — English</Label>
          <Textarea
            id="freeDeliveryBannerTextEn"
            name="freeDeliveryBannerTextEn"
            rows={2}
            value={freeDeliveryEn}
            onChange={(e) => setFreeDeliveryEn(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="freeDeliveryBannerTextBn">Banner text — Bengali</Label>
          <Textarea
            id="freeDeliveryBannerTextBn"
            name="freeDeliveryBannerTextBn"
            rows={2}
            value={freeDeliveryBn}
            onChange={(e) => setFreeDeliveryBn(e.target.value)}
            required
          />
        </div>
        <p className="text-xs text-gray-500">
          Use <code>{"{amount}"}</code> where the minimum order amount should appear.
        </p>

        <div className="space-y-1.5 rounded-control bg-surface-muted p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</p>
          <p className="text-brand-dark">{freeDeliveryEnabled ? previewText(freeDeliveryEn, freeDeliveryAmount) : "(offer hidden — switch is off)"}</p>
          {freeDeliveryEnabled && <p className="text-brand-dark">{previewText(freeDeliveryBn, freeDeliveryAmount)}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-control border border-border-brand p-4">
        <h3 className="font-heading text-sm font-bold text-brand-dark">Free delivery on all orders</h3>
        <p className="text-xs text-gray-500">
          Replaces the old per-zone &quot;spend X, get free delivery&quot; rule with one sitewide switch. Off by default.
        </p>

        <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
          <input
            type="checkbox"
            name="allOrdersFreeDeliveryEnabled"
            value="1"
            checked={allOrdersEnabled}
            onChange={(e) => setAllOrdersEnabled(e.target.checked)}
          />
          Apply free delivery to every order at checkout
        </label>

        <div className="max-w-xs">
          <Label htmlFor="allOrdersFreeDeliveryThreshold">Minimum order amount (Tk)</Label>
          <Input
            id="allOrdersFreeDeliveryThreshold"
            name="allOrdersFreeDeliveryThreshold"
            type="number"
            min="1"
            max="100000"
            step="1"
            value={allOrdersAmount}
            onChange={(e) => setAllOrdersAmount(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-gray-500">Any order (not just a customer&apos;s first) reaching this amount (Tk) gets free delivery.</p>
        </div>

        <div>
          <Label htmlFor="allOrdersBannerTextEn">Banner text — English (optional)</Label>
          <Textarea
            id="allOrdersBannerTextEn"
            name="allOrdersBannerTextEn"
            rows={2}
            value={allOrdersEn}
            onChange={(e) => setAllOrdersEn(e.target.value)}
            placeholder="Leave blank to apply the discount without a banner"
          />
        </div>
        <div>
          <Label htmlFor="allOrdersBannerTextBn">Banner text — Bengali (optional)</Label>
          <Textarea
            id="allOrdersBannerTextBn"
            name="allOrdersBannerTextBn"
            rows={2}
            value={allOrdersBn}
            onChange={(e) => setAllOrdersBn(e.target.value)}
            placeholder="Leave blank to apply the discount without a banner"
          />
        </div>
        <p className="text-xs text-gray-500">
          Use <code>{"{amount}"}</code> where the minimum order amount should appear. If both banner fields are left blank, this offer
          applies at checkout without appearing in the announcement banner.
        </p>

        <div className="space-y-1.5 rounded-control bg-surface-muted p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</p>
          {!allOrdersEnabled ? (
            <p className="text-brand-dark">(offer off)</p>
          ) : (
            <>
              <p className="text-brand-dark">{allOrdersEn.trim() ? previewText(allOrdersEn, allOrdersAmount) : "(no banner text — discount still applies)"}</p>
              {allOrdersBn.trim() && <p className="text-brand-dark">{previewText(allOrdersBn, allOrdersAmount)}</p>}
            </>
          )}
        </div>
      </div>

      <SubmitButton className="w-auto px-6">Save settings</SubmitButton>
    </form>
  );
}
