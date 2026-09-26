"use client";

import { useActionState } from "react";
import { createVendorCouponAction } from "@/lib/actions/vendor-coupons";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function CouponForm() {
  const [state, formAction] = useActionState(createVendorCouponAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="rounded-control bg-brand-bg px-3.5 py-2.5 text-sm text-brand-dark">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Coupon code</Label>
          <Input id="code" name="code" placeholder="SAVE10" required aria-invalid={!!state.fieldErrors?.code} />
          <FieldError>{state.fieldErrors?.code?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="type">Discount type</Label>
          <Select id="type" name="type" defaultValue="PERCENTAGE">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount (Tk)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="value">Value</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0" required aria-invalid={!!state.fieldErrors?.value} />
          <FieldError>{state.fieldErrors?.value?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="minOrderAmount">Minimum order (Tk)</Label>
          <Input id="minOrderAmount" name="minOrderAmount" type="number" step="0.01" min="0" defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="maxDiscountAmount">Max discount (optional, Tk)</Label>
          <Input id="maxDiscountAmount" name="maxDiscountAmount" type="number" step="0.01" min="0" />
        </div>
        <div>
          <Label htmlFor="perCustomerLimit">Uses per customer</Label>
          <Input id="perCustomerLimit" name="perCustomerLimit" type="number" min="1" defaultValue={1} />
        </div>
        <div>
          <Label htmlFor="startsAt">Starts</Label>
          <Input id="startsAt" name="startsAt" type="date" required aria-invalid={!!state.fieldErrors?.startsAt} />
          <FieldError>{state.fieldErrors?.startsAt?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="endsAt">Ends</Label>
          <Input id="endsAt" name="endsAt" type="date" required aria-invalid={!!state.fieldErrors?.endsAt} />
          <FieldError>{state.fieldErrors?.endsAt?.[0]}</FieldError>
        </div>
      </div>
      <SubmitButton className="w-auto px-6">Create coupon</SubmitButton>
    </form>
  );
}
