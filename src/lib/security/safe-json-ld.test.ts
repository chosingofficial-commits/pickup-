import { describe, it, expect } from "vitest";
import { safeJsonLdStringify } from "./safe-json-ld";

/**
 * Regression coverage for SEC-2: JSON.stringify alone doesn't escape
 * </script>, so a vendor-controlled product name containing that string
 * broke out of the <script type="application/ld+json"> tag it was rendered
 * into and executed as a stored XSS payload on the product/homepage/
 * restaurant pages. This is the exact payload from the report.
 */
describe("safeJsonLdStringify", () => {
  it("escapes a product name designed to break out of the script tag", () => {
    const data = { name: "</script><script>alert(1)</script>" };
    const out = safeJsonLdStringify(data);

    expect(out.toLowerCase()).not.toContain("</script");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(JSON.parse(out)).toEqual(data);
  });

  it("escapes &, and the U+2028/U+2029 line/paragraph separators", () => {
    const data = { a: "Tom & Jerry", b: "line break", c: "para sep" };
    const out = safeJsonLdStringify(data);

    expect(out).not.toContain("&");
    expect(out).not.toContain(" ");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toEqual(data);
  });

  it("round-trips ordinary data unchanged", () => {
    const data = { "@type": "Product", name: "Rice 5kg", price: 450 };
    expect(JSON.parse(safeJsonLdStringify(data))).toEqual(data);
  });
});
