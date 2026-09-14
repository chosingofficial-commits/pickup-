"use client";

import { useActionState } from "react";
import { addAddressAction } from "@/lib/actions/address";
import { initialActionState } from "@/lib/actions/types";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import type { NeighbourhoodOption } from "@/components/location/location-selector";

export function AddressForm({ neighbourhoods }: { neighbourhoods: NeighbourhoodOption[] }) {
  const [state, formAction] = useActionState(addAddressAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-control bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="recipientName">Recipient name</Label>
          <Input id="recipientName" name="recipientName" required aria-invalid={!!state.fieldErrors?.recipientName} />
          <FieldError>{state.fieldErrors?.recipientName?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="recipientPhone">Recipient phone</Label>
          <Input id="recipientPhone" name="recipientPhone" type="tel" placeholder="01712345678" required aria-invalid={!!state.fieldErrors?.recipientPhone} />
          <FieldError>{state.fieldErrors?.recipientPhone?.[0]}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="neighbourhoodId">Area (Khagrachari Sadar)</Label>
        <Select id="neighbourhoodId" name="neighbourhoodId" required defaultValue="" aria-invalid={!!state.fieldErrors?.neighbourhoodId}>
          <option value="" disabled>
            Select your area
          </option>
          {neighbourhoods.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}, {n.townName}
            </option>
          ))}
        </Select>
        <FieldError>{state.fieldErrors?.neighbourhoodId?.[0]}</FieldError>
        <p className="mt-1 text-xs text-gray-500">Only areas within Pick Up&apos;s active coverage are listed.</p>
      </div>

      <div>
        <Label htmlFor="streetOrVillage">Street / house / village</Label>
        <Textarea id="streetOrVillage" name="streetOrVillage" rows={2} required aria-invalid={!!state.fieldErrors?.streetOrVillage} />
        <FieldError>{state.fieldErrors?.streetOrVillage?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="landmark">Landmark (optional)</Label>
        <Input id="landmark" name="landmark" placeholder="E.g. near Khagrachari Stadium" />
      </div>

      <div>
        <Label htmlFor="label">Save as</Label>
        <Select id="label" name="label" defaultValue="Home">
          <option value="Home">Home</option>
          <option value="Work">Work</option>
          <option value="Other">Other</option>
        </Select>
      </div>

      <SubmitButton>Save address & continue</SubmitButton>
    </form>
  );
}
