"use client";

import { useActionState } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { deleteAddressAction } from "@/lib/actions/address";
import { initialActionState } from "@/lib/actions/types";

export type AddressListItem = {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  streetOrVillage: string;
  landmark: string | null;
  neighbourhoodName: string;
  townName: string;
  isDefault: boolean;
};

function AddressCard({ address }: { address: AddressListItem }) {
  const [, formAction] = useActionState(deleteAddressAction, initialActionState);

  return (
    <div className="flex items-start justify-between gap-3 rounded-card border border-border-brand bg-white p-4">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-brand-dark">
            {address.label} {address.isDefault && <span className="ml-1 text-xs font-normal text-brand-primary">(Default)</span>}
          </p>
          <p className="text-xs text-gray-600">
            {address.recipientName} · {address.recipientPhone}
          </p>
          <p className="text-xs text-gray-500">
            {address.streetOrVillage}, {address.neighbourhoodName}, {address.townName}
            {address.landmark ? ` · ${address.landmark}` : ""}
          </p>
        </div>
      </div>
      <form action={formAction}>
        <input type="hidden" name="addressId" value={address.id} />
        <button type="submit" aria-label="Delete address" className="text-gray-400 hover:text-red-600">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function AddressList({ addresses }: { addresses: AddressListItem[] }) {
  if (addresses.length === 0) {
    return <p className="text-sm text-gray-500">You haven&apos;t saved any addresses yet.</p>;
  }
  return (
    <div className="space-y-3">
      {addresses.map((a) => (
        <AddressCard key={a.id} address={a} />
      ))}
    </div>
  );
}
