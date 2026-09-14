"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { submitVendorApplicationAction } from "@/lib/actions/vendor-application";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/forms/file-upload-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";

const CUISINE_SUGGESTIONS = ["Bangla food", "Biriyani", "Fast food", "Chinese", "Bakery", "Snacks", "Indigenous food", "Beverages"];

export function VendorApplicationWizard({
  categories,
  defaults,
}: {
  categories: { id: string; name: string; slug: string }[];
  defaults: { name: string; email: string; phone: string };
}) {
  const [state, formAction] = useActionState(submitVendorApplicationAction, initialActionState);
  const [businessType, setBusinessType] = useState<"GROCERY_VENDOR" | "RESTAURANT">("GROCERY_VENDOR");
  const [step, setStep] = useState(0);

  const isRestaurant = businessType === "RESTAURANT";
  const steps = isRestaurant
    ? ["Business type", "Address", "Cuisine", "Hours", "Documents", "Review"]
    : ["Business type", "Address", "Categories", "Documents", "Review"];
  const lastStep = steps.length - 1;

  function next() {
    setStep((s) => Math.min(lastStep, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  // Maps the visible wizard step index to a stable section key so restaurant/vendor
  // flows (which have a different number of steps) show the right fields.
  const sectionForStep = (i: number): "type" | "address" | "categories" | "hours" | "documents" | "review" => {
    if (i === 0) return "type";
    if (i === 1) return "address";
    if (isRestaurant) {
      if (i === 2) return "categories";
      if (i === 3) return "hours";
      if (i === 4) return "documents";
      return "review";
    }
    if (i === 2) return "categories";
    if (i === 3) return "documents";
    return "review";
  };
  const activeSection = sectionForStep(step);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="businessType" value={businessType} />

      <ol className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                i < step ? "bg-brand-primary text-white" : i === step ? "border-2 border-brand-primary text-brand-primary" : "border border-border-brand text-gray-400",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-xs font-medium", i === step ? "text-brand-dark" : "text-gray-400")}>{label}</span>
          </li>
        ))}
      </ol>

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className={cn("space-y-4 rounded-card border border-border-brand bg-white p-5", activeSection !== "type" && "hidden")}>
        <h2 className="font-heading text-base font-bold text-brand-dark">What are you registering?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={cn(
              "cursor-pointer rounded-control border-2 p-4 text-sm",
              businessType === "GROCERY_VENDOR" ? "border-brand-primary bg-brand-bg" : "border-border-brand",
            )}
          >
            <input type="radio" className="sr-only" checked={businessType === "GROCERY_VENDOR"} onChange={() => setBusinessType("GROCERY_VENDOR")} />
            <span className="block font-semibold text-brand-dark">Grocery / retail shop</span>
            <span className="block text-xs text-gray-500">Sell groceries, essentials, household, or personal care products, available 24/7.</span>
          </label>
          <label
            className={cn(
              "cursor-pointer rounded-control border-2 p-4 text-sm",
              businessType === "RESTAURANT" ? "border-brand-primary bg-brand-bg" : "border-border-brand",
            )}
          >
            <input type="radio" className="sr-only" checked={businessType === "RESTAURANT"} onChange={() => setBusinessType("RESTAURANT")} />
            <span className="block font-semibold text-brand-dark">Restaurant</span>
            <span className="block text-xs text-gray-500">Serve food during your own opening hours, with menu and order management.</span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" name="businessName" required aria-invalid={!!state.fieldErrors?.businessName} />
            <FieldError>{state.fieldErrors?.businessName?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="ownerName">Owner&apos;s name</Label>
            <Input id="ownerName" name="ownerName" defaultValue={defaults.name} required aria-invalid={!!state.fieldErrors?.ownerName} />
            <FieldError>{state.fieldErrors?.ownerName?.[0]}</FieldError>
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
          <Label htmlFor="businessDescription">Business description</Label>
          <Textarea id="businessDescription" name="businessDescription" rows={3} placeholder="Tell customers what makes your business great" />
        </div>
      </div>

      <div className={cn("space-y-4 rounded-card border border-border-brand bg-white p-5", activeSection !== "address" && "hidden")}>
        <h2 className="font-heading text-base font-bold text-brand-dark">Address & delivery coverage</h2>
        <div>
          <Label htmlFor="addressText">Business address</Label>
          <Textarea id="addressText" name="addressText" rows={2} required aria-invalid={!!state.fieldErrors?.addressText} />
          <FieldError>{state.fieldErrors?.addressText?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="deliveryCoverageText">Delivery coverage</Label>
          <Input id="deliveryCoverageText" name="deliveryCoverageText" placeholder="E.g. Khagrachari town centre and Shapla Chattar" required aria-invalid={!!state.fieldErrors?.deliveryCoverageText} />
          <FieldError>{state.fieldErrors?.deliveryCoverageText?.[0]}</FieldError>
        </div>
      </div>

      <div className={cn("space-y-4 rounded-card border border-border-brand bg-white p-5", activeSection !== "categories" && "hidden")}>
        <h2 className="font-heading text-base font-bold text-brand-dark">{isRestaurant ? "Cuisine types" : "Product categories"}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(isRestaurant ? CUISINE_SUGGESTIONS : categories.map((c) => c.name)).map((label) => (
            <label key={label} className="flex items-center gap-2 rounded-control border border-border-brand px-3 py-2 text-sm">
              <input type="checkbox" name="productCategories" value={label} />
              {label}
            </label>
          ))}
        </div>
        <FieldError>{state.fieldErrors?.productCategories?.[0]}</FieldError>
      </div>

      {isRestaurant && (
        <div className={cn("space-y-4 rounded-card border border-border-brand bg-white p-5", activeSection !== "hours" && "hidden")}>
          <h2 className="font-heading text-base font-bold text-brand-dark">Operating hours</h2>
          <div>
            <Label htmlFor="openingHoursText">Typical opening hours</Label>
            <Input id="openingHoursText" name="openingHoursText" placeholder="E.g. 10:00 AM – 10:00 PM, every day" />
            <p className="mt-1 text-xs text-gray-500">You&apos;ll be able to set exact daily hours after approval, in your restaurant dashboard.</p>
          </div>
        </div>
      )}

      <div className={cn("space-y-4 rounded-card border border-border-brand bg-white p-5", activeSection !== "documents" && "hidden")}>
        <h2 className="font-heading text-base font-bold text-brand-dark">Documents & banking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tradeLicenseNo">Trade licence number</Label>
            <Input id="tradeLicenseNo" name="tradeLicenseNo" required aria-invalid={!!state.fieldErrors?.tradeLicenseNo} />
            <FieldError>{state.fieldErrors?.tradeLicenseNo?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="nationalIdNo">National ID number</Label>
            <Input id="nationalIdNo" name="nationalIdNo" required aria-invalid={!!state.fieldErrors?.nationalIdNo} />
            <FieldError>{state.fieldErrors?.nationalIdNo?.[0]}</FieldError>
          </div>
        </div>
        <FileUploadField name="tradeLicenseDocUrl" label="Trade licence document" folder="vendor-documents" accept="image/jpeg,image/png,application/pdf" required />
        <FieldError>{state.fieldErrors?.tradeLicenseDocUrl?.[0]}</FieldError>
        <FileUploadField name="nationalIdDocUrl" label="National ID document" folder="vendor-documents" accept="image/jpeg,image/png,application/pdf" required />
        <FieldError>{state.fieldErrors?.nationalIdDocUrl?.[0]}</FieldError>
        <div>
          <Label htmlFor="bankOrMfsAccount">Bank or mobile financial account (for payouts)</Label>
          <Input id="bankOrMfsAccount" name="bankOrMfsAccount" placeholder="E.g. bKash 01XXXXXXXXX or bank account number" required aria-invalid={!!state.fieldErrors?.bankOrMfsAccount} />
          <FieldError>{state.fieldErrors?.bankOrMfsAccount?.[0]}</FieldError>
        </div>
        <FileUploadField name="logoUrl" label="Logo (optional)" folder="vendor-logos" />
        <FileUploadField name="coverImageUrl" label="Cover image (optional)" folder="vendor-covers" />
      </div>

      <div className={cn("space-y-4 rounded-card border border-border-brand bg-white p-5", activeSection !== "review" && "hidden")}>
        <h2 className="font-heading text-base font-bold text-brand-dark">Review & submit</h2>
        <p className="text-sm text-gray-600">
          Our team will review your application, typically within 2–3 business days. You&apos;ll be notified once it&apos;s
          approved, rejected, or if we need more information.
        </p>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="agreementAccepted" value="1" required className="mt-0.5" />
          I confirm the information provided is accurate and I agree to Pick Up&apos;s Vendor Agreement and Terms of Service.
        </label>
        <FieldError>{state.fieldErrors?.agreementAccepted?.[0]}</FieldError>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="rounded-control border border-border-brand px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-40"
        >
          Back
        </button>
        {step < lastStep ? (
          <button type="button" onClick={next} className="rounded-control bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover">
            Continue
          </button>
        ) : (
          <SubmitButton className="w-auto px-6">Submit application</SubmitButton>
        )}
      </div>
    </form>
  );
}
