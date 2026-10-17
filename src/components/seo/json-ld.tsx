import { safeJsonLdStringify } from "@/lib/security/safe-json-ld";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }} />;
}
