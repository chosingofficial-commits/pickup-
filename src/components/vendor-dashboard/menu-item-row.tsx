"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product/product-image";
import { FileUploadField } from "@/components/forms/file-upload-field";
import {
  toggleMenuItemAvailabilityAction,
  deleteMenuItemAction,
  updateMenuItemAction,
  updateMenuItemPhotosAction,
  updateMenuItemSuggestionsAction,
  createAddOnGroupAction,
  updateAddOnGroupAction,
  deleteAddOnGroupAction,
  createAddOnAction,
  updateAddOnAction,
  toggleAddOnAvailabilityAction,
  deleteAddOnAction,
} from "@/lib/actions/vendor-menu";
import { initialActionState } from "@/lib/actions/types";
import { MAX_MENU_ITEM_PHOTOS, MAX_SUGGESTED_ITEMS } from "@/lib/validation/menu-item";
import { formatBDT } from "@/lib/utils";

type AddOn = { id: string; name: string; priceDelta: string; isPopular: boolean; isAvailable: boolean };
type AddOnGroup = { id: string; name: string; isRequired: boolean; minSelect: number; maxSelect: number; addOns: AddOn[] };
type OtherItem = { id: string; name: string; price: string; imageUrl: string | null };
export type MenuItemRowData = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  allergens: string | null;
  isAvailable: boolean;
  photos: string[];
  suggestedItemIds: string[];
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
        <label className="mb-1 block text-xs text-gray-500">Choice name</label>
        <input name="name" required placeholder="E.g. Large" className="h-8 w-32 rounded-control border border-border-brand px-2 text-xs" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Extra price (Tk)</label>
        <input name="priceDelta" type="number" step="0.01" min="0" defaultValue="0" className="h-8 w-24 rounded-control border border-border-brand px-2 text-xs" />
      </div>
      <label className="flex items-center gap-1.5 text-xs text-brand-dark">
        <input type="checkbox" name="isPopular" value="1" />
        Popular
      </label>
      <button type="submit" disabled={pending} className="h-8 rounded-control border border-border-brand px-3 text-xs font-semibold text-brand-dark hover:bg-brand-bg disabled:opacity-60">
        {pending ? "Adding…" : "+ Add choice"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function EditAddOnForm({ addOn, onClose }: { addOn: AddOn; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateAddOnAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-control bg-surface-muted p-2">
      <input type="hidden" name="addOnId" value={addOn.id} />
      <div>
        <label className="mb-1 block text-xs text-gray-500">Choice name</label>
        <input name="name" defaultValue={addOn.name} required className="h-8 w-32 rounded-control border border-border-brand px-2 text-xs" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Extra price (Tk)</label>
        <input name="priceDelta" type="number" step="0.01" min="0" defaultValue={addOn.priceDelta} className="h-8 w-24 rounded-control border border-border-brand px-2 text-xs" />
      </div>
      <label className="flex items-center gap-1.5 text-xs text-brand-dark">
        <input type="checkbox" name="isPopular" value="1" defaultChecked={addOn.isPopular} />
        Popular
      </label>
      <button type="submit" disabled={pending} className="h-8 rounded-control bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onClose} className="h-8 rounded-control border border-border-brand px-3 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        Cancel
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function GroupSettingsFields({
  defaults,
}: {
  defaults?: { name: string; isRequired: boolean; minSelect: number; maxSelect: number };
}) {
  const [isRequired, setIsRequired] = useState(defaults?.isRequired ?? false);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input name="name" required defaultValue={defaults?.name} placeholder="Group name, e.g. Size" className="h-9 flex-1 rounded-control border border-border-brand px-2.5 text-xs" />
        <label className="flex items-center gap-1.5 text-xs text-brand-dark">
          <input type="checkbox" name="isRequired" value="1" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
          Required
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {isRequired && (
          <span className="flex items-center gap-1.5">
            Min choices
            <input name="minSelect" type="number" min="1" max="20" defaultValue={defaults?.minSelect || 1} className="h-8 w-16 rounded-control border border-border-brand px-2" />
          </span>
        )}
        {!isRequired && <input type="hidden" name="minSelect" value="0" />}
        <span className="flex items-center gap-1.5">
          Max choices
          <input name="maxSelect" type="number" min="1" max="20" defaultValue={defaults?.maxSelect || 1} className="h-8 w-16 rounded-control border border-border-brand px-2" />
        </span>
      </div>
    </>
  );
}

function AddGroupForm({ menuItemId }: { menuItemId: string }) {
  const [state, formAction, pending] = useActionState(createAddOnGroupAction, initialActionState);
  return (
    <form action={formAction} className="space-y-2 rounded-control bg-surface-muted p-3">
      <input type="hidden" name="menuItemId" value={menuItemId} />
      <GroupSettingsFields />
      <button type="submit" disabled={pending} className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Adding…" : "Add option group"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function EditGroupForm({ group, onClose }: { group: AddOnGroup; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateAddOnGroupAction, initialActionState);
  return (
    <form action={formAction} className="space-y-2 rounded-control bg-surface-muted p-3">
      <input type="hidden" name="groupId" value={group.id} />
      <GroupSettingsFields defaults={group} />
      <div className="flex gap-2">
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
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-gray-500">Ingredients (optional)</label>
        <textarea name="ingredients" defaultValue={item.ingredients ?? ""} rows={2} className="w-full rounded-control border border-border-brand px-2.5 py-1.5 text-xs" />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-gray-500">Allergens (optional)</label>
        <input name="allergens" defaultValue={item.allergens ?? ""} placeholder="E.g. Contains nuts, dairy" className="h-9 w-full rounded-control border border-border-brand px-2.5 text-xs" />
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

function PhotosPanel({ itemId, photos }: { itemId: string; photos: string[] }) {
  const [state, formAction, pending] = useActionState(updateMenuItemPhotosAction, initialActionState);
  const [urls, setUrls] = useState<(string | null)[]>(() => {
    const slots = Array.from({ length: MAX_MENU_ITEM_PHOTOS }, (_, i) => photos[i] ?? null);
    return slots;
  });

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    setUrls((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-3 rounded-control bg-surface-muted p-3">
      <input type="hidden" name="itemId" value={itemId} />
      <p className="text-xs text-gray-500">Up to {MAX_MENU_ITEM_PHOTOS} photos. JPEG, PNG, or WebP, 5MB max.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {urls.map((url, i) => (
          // Keyed on slot index + current url so moving a photo up/down remounts
          // the (otherwise uncontrolled) FileUploadField with its new defaultUrl.
          <div key={`${i}-${url ?? "empty"}`} className="space-y-1">
            <FileUploadField
              fieldId={`menuItemPhoto-${itemId}-${i}`}
              name={`_photoSlot-${i}`}
              label={`Photo ${i + 1}`}
              folder="menu-items"
              defaultUrl={url}
              hint="JPEG, PNG, or WebP, 5MB max"
              onUrlChange={(newUrl) =>
                setUrls((prev) => {
                  const next = [...prev];
                  next[i] = newUrl;
                  return next;
                })
              }
            />
            <div className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-control border border-border-brand px-2 py-0.5 text-[11px] text-brand-dark disabled:opacity-30">
                ↑ Move up
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === urls.length - 1}
                className="rounded-control border border-border-brand px-2 py-0.5 text-[11px] text-brand-dark disabled:opacity-30"
              >
                ↓ Move down
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Each FileUploadField slot above posts under its own `_photoSlot-N` name
          (so reordering state, not DOM order, decides what gets saved) — these
          are the actual `photoUrls` the server reads, in the user's chosen order. */}
      {urls.filter((u): u is string => !!u).map((u, i) => (
        <input key={`${u}-${i}`} type="hidden" name="photoUrls" value={u} />
      ))}
      <button type="submit" disabled={pending} className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Save photos"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function SuggestionsPanel({ itemId, otherItems, selectedIds }: { itemId: string; otherItems: OtherItem[]; selectedIds: string[] }) {
  const [state, formAction, pending] = useActionState(updateMenuItemSuggestionsAction, initialActionState);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SUGGESTED_ITEMS) next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-3 rounded-control bg-surface-muted p-3">
      <input type="hidden" name="itemId" value={itemId} />
      <p className="text-xs text-gray-500">
        Suggest up to {MAX_SUGGESTED_ITEMS} other items to show as &quot;Frequently bought together&quot; ({selected.size}/{MAX_SUGGESTED_ITEMS} selected).
      </p>
      {otherItems.length === 0 ? (
        <p className="text-xs text-gray-400">Add more items to this menu first.</p>
      ) : (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {otherItems.map((other) => (
            <label key={other.id} className="flex items-center gap-2 rounded-control bg-white px-2.5 py-1.5 text-xs">
              <input type="checkbox" checked={selected.has(other.id)} onChange={() => toggle(other.id)} disabled={!selected.has(other.id) && selected.size >= MAX_SUGGESTED_ITEMS} />
              {selected.has(other.id) && <input type="hidden" name="suggestedItemId" value={other.id} />}
              <span className="flex-1">{other.name}</span>
              <span className="text-gray-500">{formatBDT(other.price)}</span>
            </label>
          ))}
        </div>
      )}
      <button type="submit" disabled={pending} className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Save suggestions"}
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function MenuItemRow({ item, otherItems }: { item: MenuItemRowData; otherItems: OtherItem[] }) {
  const [editing, setEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);

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
        <button type="button" onClick={() => setShowPhotos((v) => !v)} className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Photos {item.photos.length > 0 && `(${item.photos.length})`}
        </button>
        <button type="button" onClick={() => setShowSuggestions((v) => !v)} className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          Suggestions {item.suggestedItemIds.length > 0 && `(${item.suggestedItemIds.length})`}
        </button>
        <form action={toggleMenuItemAvailabilityAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
            {item.isAvailable ? "Mark sold out" : "Mark available"}
          </button>
        </form>
        <form
          action={deleteMenuItemAction}
          onSubmit={(e) => {
            if (!confirm(`Delete "${item.name}"? Items with past orders are hidden instead of removed.`)) e.preventDefault();
          }}
        >
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

      {showPhotos && (
        <div className="mt-3 border-t border-border-brand pt-3">
          <PhotosPanel itemId={item.id} photos={item.photos} />
        </div>
      )}

      {showSuggestions && (
        <div className="mt-3 border-t border-border-brand pt-3">
          <SuggestionsPanel itemId={item.id} otherItems={otherItems} selectedIds={item.suggestedItemIds} />
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
                    {group.isRequired ? `Required · min ${group.minSelect}` : "Optional"} · max {group.maxSelect}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGroupId((id) => (id === group.id ? null : group.id))}
                    className="rounded-control border border-border-brand px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-bg"
                  >
                    {editingGroupId === group.id ? "Close" : "Edit"}
                  </button>
                  <form action={deleteAddOnGroupAction}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <button type="submit" className="rounded-control border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Delete group
                    </button>
                  </form>
                </div>
              </div>

              {editingGroupId === group.id && (
                <div className="mb-2">
                  <EditGroupForm group={group} onClose={() => setEditingGroupId(null)} />
                </div>
              )}

              <div className="space-y-1.5">
                {group.addOns.map((addOn) => (
                  <div key={addOn.id}>
                    <div className={`flex items-center justify-between rounded-control px-3 py-1.5 text-xs ${addOn.isAvailable ? "bg-surface-muted" : "bg-gray-100 opacity-60"}`}>
                      <span className="flex items-center gap-1.5">
                        {addOn.name} {Number(addOn.priceDelta) > 0 && <span className="text-gray-500">+{formatBDT(addOn.priceDelta)}</span>}
                        {addOn.isPopular && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Popular</span>}
                        {!addOn.isAvailable && <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">Unavailable</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => setEditingAddOnId((id) => (id === addOn.id ? null : addOn.id))} className="font-semibold text-brand-dark hover:underline">
                          Edit
                        </button>
                        <form action={toggleAddOnAvailabilityAction}>
                          <input type="hidden" name="addOnId" value={addOn.id} />
                          <button type="submit" className="font-semibold text-brand-dark hover:underline">
                            {addOn.isAvailable ? "Mark unavailable" : "Mark available"}
                          </button>
                        </form>
                        <form action={deleteAddOnAction}>
                          <input type="hidden" name="addOnId" value={addOn.id} />
                          <button type="submit" className="font-semibold text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </span>
                    </div>
                    {editingAddOnId === addOn.id && (
                      <div className="mt-1">
                        <EditAddOnForm addOn={addOn} onClose={() => setEditingAddOnId(null)} />
                      </div>
                    )}
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
