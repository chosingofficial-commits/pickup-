/** A same-origin relative path only — never an absolute/protocol-relative URL, to prevent an open redirect via `next`. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
