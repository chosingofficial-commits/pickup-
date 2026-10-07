"use client";

import { useRef, useState } from "react";
import { Upload, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Private-bucket folders return an opaque storage key (not a fetchable URL —
// see handleChange below), and document uploads can be a PDF either way —
// neither can ever be rendered as an <img>, so a thumbnail only ever shows
// for a real, likely-image URL.
function looksLikeImageUrl(value: string): boolean {
  return /^(https?:)?\//.test(value) && !/\.pdf($|\?)/i.test(value);
}

export function FileUploadField({
  name,
  label,
  folder,
  accept = "image/jpeg,image/png,image/webp",
  required,
  hint,
  defaultUrl,
  fieldId,
  onUrlChange,
  onPreviewChange,
}: {
  name: string;
  label: string;
  folder: "vendor-logos" | "vendor-covers" | "vendor-documents" | "products" | "menu-items" | "ad-pending" | "avatars" | "hero";
  accept?: string;
  required?: boolean;
  hint?: string;
  defaultUrl?: string | null;
  /** Override the DOM id when several fields share the same `name` (e.g. multiple photo slots posted via FormData.getAll). */
  fieldId?: string;
  /** For a parent that wants to mirror the uploaded URL/key into its own state (e.g. to submit it). */
  onUrlChange?: (url: string | null) => void;
  /**
   * Fires immediately on file selection with a local `URL.createObjectURL`
   * preview — independent of the upload (and of whether the destination
   * folder is private, in which case the server never returns anything
   * publicly viewable). Use this for a live preview instead of onUrlChange.
   */
  onPreviewChange?: (previewUrl: string | null) => void;
}) {
  const inputId = `upload-${fieldId ?? name}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(defaultUrl ? "done" : "idle");
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  // A freshly-chosen file's local object URL always wins over `url` (which,
  // right after selection, is still the PREVIOUS value until upload
  // finishes) — same object URL the parent's onPreviewChange gets, kept
  // here too so this field can show its own thumbnail independently.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const thumbnailSrc = localPreview ?? (url && looksLikeImageUrl(url) ? url : null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(file.type.startsWith("image/") ? objectUrl : null);
    onPreviewChange?.(objectUrl);
    setStatus("uploading");
    setError(null);

    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);

    try {
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      // Private folders (e.g. vendor-documents, ad-pending) return only a
      // `key`, never a publicly-fetchable `url`.
      const uploadedUrl = data.url ?? data.key;
      setUrl(uploadedUrl);
      setStatus("done");
      onUrlChange?.(uploadedUrl);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
      onPreviewChange?.(null);
    }
  }

  function remove() {
    setUrl(null);
    setLocalPreview(null);
    setStatus("idle");
    onUrlChange?.(null);
    onPreviewChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-dark">
        {label}
      </label>
      <input type="hidden" name={name} value={url ?? ""} required={required} />
      <div
        className={cn(
          "flex items-center gap-3 rounded-control border border-dashed border-border-brand p-3",
          status === "done" && "border-brand-primary bg-brand-bg",
        )}
      >
        {thumbnailSrc && (
          <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-control border border-border-brand bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- a just-picked file is a blob: URL and an already-uploaded one may be on any configured storage host; next/image can't optimize either reliably here, and this is a small fixed-size thumbnail where that doesn't matter. */}
            <img src={thumbnailSrc} alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-control border border-border-brand bg-white px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-brand-bg"
        >
          {status === "uploading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : status === "done" ? (
            <Check className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {status === "done" ? "Replace file" : "Choose file"}
        </button>
        <span className="text-xs text-gray-500">
          {status === "uploading" ? "Uploading…" : status === "done" ? (thumbnailSrc ? "" : "Uploaded") : hint ?? "JPEG, PNG, or WebP"}
        </span>
        {status === "done" && (
          <button type="button" onClick={remove} aria-label="Remove file" className="ml-auto text-gray-400 hover:text-red-600">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <input ref={fileInputRef} id={inputId} type="file" accept={accept} onChange={handleChange} className="sr-only" />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
