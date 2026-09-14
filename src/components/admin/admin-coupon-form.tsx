"use client";

import { useActionState } from "react";
import { createPlatformCouponAction } from "@/lib/actions/admin-coupons";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

export function AdminCouponForm() {
  const [state, formAction] = useActionState(createPlatformCouponAction, initialActionState);

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
          <Label htmlFor="ac-code">Coupon code</Label>
          <Input id="ac-code" name="code" placeholder="WELCOME50" required aria-invalid={!!state.fieldErrors?.code} />
          <FieldError>{state.fieldErrors?.code?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="ac-type">Discount type</Label>
          <Select id="ac-type" name="type" defaultValue="FIXED">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount (৳)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-value">Value</Label>
          <Input id="ac-value" name="value" type="number" step="0.01" min="0" required aria-invalid={!!state.fieldErrors?.value} />
          <FieldError>{state.fieldErrors?.value?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="ac-min">Minimum order (৳)</Label>
          <Input id="ac-min" name="minOrderAmount" type="number" step="0.01" min="0" defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="ac-max">Max discount (optional, ৳)</Label>
          <Input id="ac-max" name="maxDiscountAmount" type="number" step="0.01" min="0" />
        </div>
        <div>
          <Label htmlFor="ac-per">Uses per customer</Label>
          <Input id="ac-per" name="perCustomerLimit" type="number" min="1" defaultValue={1} />
        </div>
        <div>
          <Label htmlFor="ac-usage">Total usage limit (optional)</Label>
          <Input id="ac-usage" name="usageLimit" type="number" min="1" />
        </div>
        <div>
          <Label htmlFor="ac-starts">Starts</Label>
          <Input id="ac-starts" name="startsAt" type="date" required aria-invalid={!!state.fieldErrors?.startsAt} />
        </div>
        <div>
          <Label htmlFor="ac-ends">Ends</Label>
          <Input id="ac-ends" name="endsAt" type="date" required aria-invalid={!!state.fieldErrors?.endsAt} />
        </div>
      </div>
      <SubmitButton className="w-auto px-6">Create coupon</SubmitButton>
    </form>
  );
}
