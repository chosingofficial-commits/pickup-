"use client";

import { useActionState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { addMenuItemToCartAction } from "@/lib/actions/cart";
import { initialActionState } from "@/lib/actions/types";
import { ProductImage } from "@/components/product/product-image";
import { formatBDT } from "@/lib/utils";

type AddOn = { id: string; name: string; priceDelta: string };
type AddOnGroup = { id: string; name: string; isRequired: boolean; maxSelect: number; addOns: AddOn[] };
export type MenuItemWithAddOns = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  allowsInstructions: boolean;
  addOnGroups: AddOnGroup[];
};

export function MenuItemCard({ item, canOrder }: { item: MenuItemWithAddOns; canOrder: boolean }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(addMenuItemToCartAction, initialActionState);
  const hasOptions = item.addOnGroups.length > 0;

  return (
    <div className="flex gap-3 rounded-card border border-border-brand bg-white p-3">
      <ProductImage src={item.imageUrl} alt={item.name} categorySlug="restaurant" className="h-20 w-20 shrink-0 rounded-control" emoji="🍽️" />
      <div className="flex flex-1 flex-col">
        <h3 className="font-heading text-sm font-bold text-brand-dark">{item.name}</h3>
        {item.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-heading text-sm font-bold text-brand-dark">{formatBDT(item.price)}</span>
          {canOrder && item.isAvailable ? (
            <button
              type="button"
              onClick={() => {
                if (hasOptions) {
                  dialogRef.current?.showModal();
                  return;
                }
                const form = new FormData();
                form.set("menuItemId", item.id);
                form.set("quantity", "1");
                form.set("redirectPath", pathname);
                formAction(form);
              }}
              className="flex items-center gap-1 rounded-control bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {state.status === "success" ? "Added" : "Add"}
            </button>
          ) : (
            <span className="text-xs font-medium text-gray-400">{item.isAvailable ? "Closed" : "Unavailable"}</span>
          )}
        </div>
        {state.status === "error" && <p className="mt-1 text-xs text-red-600">{state.message}</p>}
      </div>

      {hasOptions && (
        <dialog
          ref={dialogRef}
          aria-label={`Customize ${item.name}`}
          className="w-full max-w-md rounded-card border border-border-brand p-0 shadow-lifted backdrop:bg-black/40"
        >
          <form action={formAction}>
            <input type="hidden" name="menuItemId" value={item.id} />
            <input type="hidden" name="redirectPath" value={pathname} />
            <div className="border-b border-border-brand p-4">
              <h3 className="font-heading text-base font-bold text-brand-dark">{item.name}</h3>
              <p className="text-sm text-gray-500">{formatBDT(item.price)}</p>
            </div>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto p-4">
              {item.addOnGroups.map((group) => (
                <fieldset key={group.id}>
                  <legend className="mb-1.5 text-sm font-semibold text-brand-dark">
                    {group.name} {group.isRequired && <span className="text-red-500">*</span>}
                  </legend>
                  <div className="space-y-1.5">
                    {group.addOns.map((addOn) => (
                      <label key={addOn.id} className="flex items-center justify-between gap-2 rounded-control border border-border-brand px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <input
                            type={group.maxSelect > 1 ? "checkbox" : "radio"}
                            name="addOnId"
                            value={addOn.id}
                            required={group.isRequired && group.maxSelect === 1}
                          />
                          {addOn.name}
                        </span>
                        {Number(addOn.priceDelta) > 0 && <span className="text-gray-500">+{formatBDT(addOn.priceDelta)}</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {item.allowsInstructions && (
                <div>
                  <label htmlFor={`note-${item.id}`} className="mb-1 block text-sm font-semibold text-brand-dark">
                    Special instructions
                  </label>
                  <textarea
                    id={`note-${item.id}`}
                    name="specialInstructions"
                    rows={2}
                    className="w-full rounded-control border border-border-brand px-3 py-2 text-sm"
                    placeholder="E.g. less spicy, no onion"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border-brand p-4">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-10 flex-1 rounded-control border border-border-brand text-sm font-semibold text-brand-dark hover:bg-brand-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                onClick={() => dialogRef.current?.close()}
                className="h-10 flex-1 rounded-control bg-brand-primary text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              >
                Add to cart
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
