"use client";

import { useActionState, useState } from "react";
import { renameMenuAction, reorderMenuAction, deleteMenuAction } from "@/lib/actions/vendor-menu";
import { initialActionState } from "@/lib/actions/types";

type OtherMenu = { id: string; name: string };

function FormMessage({ status, message }: { status: string; message?: string }) {
  if (status === "idle" || !message) return null;
  return <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>;
}

function RenameForm({ menuId, currentName, onClose }: { menuId: string; currentName: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(renameMenuAction, initialActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-control bg-surface-muted p-3">
      <input type="hidden" name="menuId" value={menuId} />
      <div>
        <label className="mb-1 block text-xs text-gray-500">Category name</label>
        <input name="name" defaultValue={currentName} required className="h-9 w-56 rounded-control border border-border-brand px-2.5 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onClose} className="h-9 rounded-control border border-border-brand px-4 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        Cancel
      </button>
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

function DeleteMenuPanel({ menuId, itemCount, otherMenus, onClose }: { menuId: string; itemCount: number; otherMenus: OtherMenu[]; onClose: () => void }) {
  const [state, formAction] = useActionState(deleteMenuAction, initialActionState);
  const [targetMenuId, setTargetMenuId] = useState(otherMenus[0]?.id ?? "");

  if (itemCount === 0) {
    return (
      <form action={formAction} className="space-y-2 rounded-control bg-red-50 p-3">
        <input type="hidden" name="menuId" value={menuId} />
        <p className="text-sm text-red-900">Delete this empty category?</p>
        <div className="flex gap-2">
          <button type="submit" className="h-9 rounded-control bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700">
            Delete category
          </button>
          <button type="button" onClick={onClose} className="h-9 rounded-control border border-border-brand bg-white px-4 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
            Cancel
          </button>
        </div>
        <FormMessage status={state.status} message={state.message} />
      </form>
    );
  }

  return (
    <div className="space-y-3 rounded-control bg-red-50 p-3">
      <p className="text-sm text-red-900">
        This category has {itemCount} item{itemCount === 1 ? "" : "s"}. What should happen to {itemCount === 1 ? "it" : "them"}?
      </p>

      {otherMenus.length > 0 && (
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="menuId" value={menuId} />
          <input type="hidden" name="mode" value="moveItems" />
          <input type="hidden" name="targetMenuId" value={targetMenuId} />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Move items to</label>
            <select value={targetMenuId} onChange={(e) => setTargetMenuId(e.target.value)} className="h-9 w-48 rounded-control border border-border-brand bg-white px-2.5 text-sm">
              {otherMenus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="h-9 rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">
            Move items &amp; delete category
          </button>
        </form>
      )}

      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(`Delete this category AND all ${itemCount} item(s) in it? This can't be undone for items with no past orders.`)) e.preventDefault();
        }}
        className="flex items-end gap-2"
      >
        <input type="hidden" name="menuId" value={menuId} />
        <input type="hidden" name="mode" value="deleteItems" />
        <button type="submit" className="h-9 rounded-control border border-red-300 bg-white px-4 text-xs font-semibold text-red-600 hover:bg-red-100">
          Delete the {itemCount} item{itemCount === 1 ? "" : "s"} too
        </button>
      </form>

      <button type="button" onClick={onClose} className="h-9 rounded-control border border-border-brand bg-white px-4 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
        Cancel
      </button>
      <FormMessage status={state.status} message={state.message} />
    </div>
  );
}

export function CategoryControls({
  menuId,
  name,
  itemCount,
  isFirst,
  isLast,
  otherMenus,
}: {
  menuId: string;
  name: string;
  itemCount: number;
  isFirst: boolean;
  isLast: boolean;
  otherMenus: OtherMenu[];
}) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={reorderMenuAction}>
          <input type="hidden" name="menuId" value={menuId} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" disabled={isFirst} aria-label="Move category up" className="rounded-control border border-border-brand px-2 py-1 text-xs text-brand-dark disabled:opacity-30">
            ↑
          </button>
        </form>
        <form action={reorderMenuAction}>
          <input type="hidden" name="menuId" value={menuId} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" disabled={isLast} aria-label="Move category down" className="rounded-control border border-border-brand px-2 py-1 text-xs text-brand-dark disabled:opacity-30">
            ↓
          </button>
        </form>
        <button type="button" onClick={() => setRenaming((v) => !v)} className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
          {renaming ? "Close" : "Rename"}
        </button>
        <button type="button" onClick={() => setDeleting((v) => !v)} className="rounded-control border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
          {deleting ? "Close" : "Delete category"}
        </button>
      </div>

      {renaming && (
        <div className="mt-3">
          <RenameForm menuId={menuId} currentName={name} onClose={() => setRenaming(false)} />
        </div>
      )}
      {deleting && (
        <div className="mt-3">
          <DeleteMenuPanel menuId={menuId} itemCount={itemCount} otherMenus={otherMenus} onClose={() => setDeleting(false)} />
        </div>
      )}
    </div>
  );
}
