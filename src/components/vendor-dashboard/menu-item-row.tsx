"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product/product-image";
import {
  toggleMenuItemAvailabilityAction,
  deleteMenuItemAction,
  updateMenuItemAction,
  createAddOnGroupAction,
  deleteAddOnGroupAction,
  createAddOnAction,
  deleteAddOnAction,
} from "@/lib/actions/vendor-menu";
import { initialActionState } from "@/lib/actions/types";
import { formatBDT } from "@/lib/utils";

type AddOn = { id: string; name: string; priceDelta: string };
type AddOnGroup = { id: string; name: string; isRequired: boolean; maxSelect: number; addOns: AddOn[] };
export type MenuItemRowData = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  addOnGroups: AddOnGroup[];
};

function FormMessage({ status, message }: { status: string; message?: string }) {
  if (status === "idle" || !message) return null;
  return <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>;
}

function AddOptionForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(createAddOnAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <div>
        <label className="mb-1 block text-xs text-gray-500">Option name</label>
        <input name="name" required placeholder="E.g. Large" className="h-8 w-32 rounded-control border border-border-brand px-2 text-xs" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Extra price (Tk)</label>
        <input name="priceDelta" type="number" step="0.01" min="0" defaultValue="0" className="h-8 w-24 rounded-control border border-border-brand px-2 text-xs" />
      </div>
      <button type="submit" disabled={pending} className="h-8 rounded-control border border-border-brand px-3 text-xs font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60">
        {pending ? "Adding…" : "+ Add option"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function AddGroupForm({ menuItemId }: { menuItemId: string }) {
  const [state, formAction, pending] = useActionState(createAddOnGroupAction, initialActionState);
  const [mode, setMode] = useState<"one" | "several">("one");

  return (
    <form action={formAction} className="space-y-2 rounded-control bg-surface-muted p-3">
      <input type="hidden" name="menuItemId" value={menuItemId} />
      <div className="flex flex-wrap gap-2">
        <input name="name" required placeholder="Group name, e.g. Size" className="h-9 flex-1 rounded-control border border-border-brand px-2.5 text-xs" />
        <label className="flex items-center gap-1.5 text-xs text-brand-dark">
          <input type="checkbox" name="isRequired" value="1" />
          Required
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="mode" checked={mode === "one"} onChange={() => setMode("one")} />
          Choose one
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="mode" checked={mode === "several"} onChange={() => setMode("several")} />
          Choose several
        </label>
        {mode === "several" && (
          <span className="flex items-center gap-1.5">
            Max choices
            <input name="maxSelect" type="number" min="2" max="20" defaultValue="2" className="h-8 w-16 rounded-control border border-border-brand px-2" />
          </span>
        )}
        {mode === "one" && <input type="hidden" name="maxSelect" value="1" />}
      </div>
      <button type="submit" disabled={pending} className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Adding…" : "Add option group"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function EditItemForm({ item, onClose }: { item: MenuItemRowData; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateMenuItemAction, initialActionState);
  return (
    <form action={formAction} className="grid gap-2 rounded-control bg-surface-muted p-3 sm:grid-cols-2">
      <input type="hidden" name="itemId" value={item.id} />
      <div>
        <label className="mb-1 block text-xs text-gray-500">Item name</label>
        <input name="name" defaultValue={item.name} required className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
        {state.fieldErrors?.name && <p className="mt-0.5 text-xs text-red-600">{state.fieldErrors.name[0]}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Price (Tk)</label>
        <input name="price" type="number" step="0.01" min="0" defaultValue={item.price} required className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
        {state.fieldErrors?.price && <p className="mt-0.5 text-xs text-red-600">{state.fieldErrors.price[0]}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Old price (optional)</label>
        <input name="compareAtPrice" type="number" step="0.01" min="0" defaultValue={item.compareAtPrice ?? ""} className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
        {state.fieldErrors?.compareAtPrice && <p className="mt-0.5 text-xs text-red-600">{state.fieldErrors.compareAtPrice[0]}</p>}
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-gray-500">Description</label>
        <input name="description" defaultValue={item.description ?? ""} className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="h-9 rounded-control border border-border-brand px-4 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Cancel
        </button>
      </div>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function MenuItemRow({ item }: { item: MenuItemRowData }) {
  const [editing, setEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="rounded-control border border-border-brand p-3">
      <div className="flex flex-wrap items-center gap-3">
        <ProductImage src={item.imageUrl} alt={item.name} categorySlug="restaurant" className="h-12 w-12 shrink-0 rounded-control" emoji="🍽️" />
        <div className="min-w-[140px] flex-1">
          <p className="text-sm font-semibold text-brand-dark">{item.name}</p>
          <p className="text-xs text-gray-500">
            {formatBDT(item.price)}
            {item.compareAtPrice && <span className="ml-1.5 text-gray-400 line-through">{formatBDT(item.compareAtPrice)}</span>}
          </p>
        </div>
        <Badge variant={item.isAvailable ? "brand" : "outline"}>{item.isAvailable ? "Available" : "Sold out"}</Badge>
        <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          {editing ? "Close" : "Edit"}
        </button>
        <button type="button" onClick={() => setShowOptions((v) => !v)} className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Options {item.addOnGroups.length > 0 && `(${item.addOnGroups.length})`}
        </button>
        <form action={toggleMenuItemAvailabilityAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
            {item.isAvailable ? "Mark sold out" : "Mark available"}
          </button>
        </form>
        <form action={deleteMenuItemAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <button type="submit" className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Delete
          </button>
        </form>
      </div>

      {editing && (
        <div className="mt-3">
          <EditItemForm item={item} onClose={() => setEditing(false)} />
        </div>
      )}

      {showOptions && (
        <div className="mt-3 space-y-3 border-t border-border-brand pt-3">
          {item.addOnGroups.map((group) => (
            <div key={group.id} className="rounded-control border border-border-brand p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-dark">
                  {group.name}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {group.isRequired ? "Required" : "Optional"} · {group.maxSelect > 1 ? `Choose up to ${group.maxSelect}` : "Choose one"}
                  </span>
                </p>
                <form action={deleteAddOnGroupAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <button type="submit" className="rounded-control border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Delete group
                  </button>
                </form>
              </div>
              <div className="space-y-1.5">
                {group.addOns.map((addOn) => (
                  <div key={addOn.id} className="flex items-center justify-between rounded-control bg-surface-muted px-3 py-1.5 text-xs">
                    <span>
                      {addOn.name} {Number(addOn.priceDelta) > 0 && <span className="text-gray-500">+{formatBDT(addOn.priceDelta)}</span>}
                    </span>
                    <form action={deleteAddOnAction}>
                      <input type="hidden" name="addOnId" value={addOn.id} />
                      <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <AddOptionForm groupId={group.id} />
              </div>
            </div>
          ))}
          <AddGroupForm menuItemId={item.id} />
        </div>
      )}
    </div>
  );
}
