import Image from "next/image";
import { cn } from "@/lib/utils";

export type AdCardData = {
  /** Campaign id — drives the /go/ad/[id] click-through link. */
  id: string;
  title: string;
  imageUrl: string;
  advertiserName: string;
};

/**
 * The one visual definition of "what an ad looks like" — used both for the
 * real carousel and for the live preview on /advertise, so the preview
 * never drifts from reality. Non-interactive (no href) renders as a plain
 * div for the preview; the real carousel always passes an id.
 */
export function AdCard({ ad, className }: { ad: Pick<AdCardData, "title" | "imageUrl" | "advertiserName"> & { id?: string }; className?: string }) {
  const content = (
    <>
      {ad.imageUrl ? (
        <Image
          src={ad.imageUrl}
          alt={ad.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 46vw, 88vw"
          className="object-cover"
          // Skip Next's image optimizer for: (1) http:// URLs from the local
          // filesystem fallback storage, which it refuses to proxy outright
          // (production always uses a real https object store, so this
          // never applies there); (2) the admin-only photo route, whose
          // internal optimizer fetch doesn't carry the admin's session
          // cookie and so 401s — the browser's own request to the <img> tag
          // does carry it, so rendering it unoptimized (a plain <img>) works.
          unoptimized={ad.imageUrl.startsWith("http://") || ad.imageUrl.startsWith("/admin/advertising/photo/")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-muted text-4xl">📣</div>
      )}
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Ad
      </span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white">
        {ad.advertiserName}
      </span>
    </>
  );

  const cardClassName = cn(
    "group relative block aspect-[2/1] w-full overflow-hidden rounded-card border border-border-brand bg-surface-muted shadow-soft",
    className,
  );

  if (!ad.id) {
    return <div className={cardClassName}>{content}</div>;
  }

  return (
    <a href={`/go/ad/${ad.id}`} target="_blank" rel="noopener sponsored" className={cn(cardClassName, "hover:shadow-lifted")}>
      {content}
    </a>
  );
}
