/**
 * JSON.stringify alone does not escape `</script>`, `&`, or the U+2028/
 * U+2029 line/paragraph separators — any of those inside embedded data (e.g.
 * a vendor-controlled product name) can break out of the
 * `<script type="application/ld+json">` tag it's rendered into. This is the
 * one safe way to serialize data for that context; JSON.parse of the result
 * always returns the original value unchanged.
 *
 * The two separator characters are built via fromCharCode rather than a
 * literal escape in source — a raw U+2028/U+2029 character embedded
 * directly in a regex literal is itself a line terminator, which breaks the
 * regex literal it would appear in.
 */
const LINE_SEPARATOR = String.fromCharCode(8232);
const PARAGRAPH_SEPARATOR = String.fromCharCode(8233);

export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}
