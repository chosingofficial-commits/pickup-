import { z } from "zod";

// A `.optional().or(z.literal(""))` union has two failure modes: (1) it
// collapses ANY failure (including a max-length or url() failure on the
// first branch) into Zod's generic top-level "Invalid input" message,
// discarding whatever specific message the branch was given; (2) it only
// accepts `undefined` for "absent", not `null` — which is what
// FormData.get() returns for a field a particular form doesn't render at
// all (e.g. a field that only exists on an edit form, not the create one).
// That silently fails parsing with no field to blame, which is exactly how
// "Add item" on /vendor/menu went silent: a create form with no
// ingredients/allergens inputs submitted `null` for them, and neither union
// branch accepted it.
//
// Preprocessing null/""/missing to `undefined` up front, before a single
// non-union inner schema, avoids both problems: real validation failures
// keep their specific message, and an absent field is treated the same as
// an empty one. Every optional string/number field parsed from a FormData
// value should use one of these two helpers instead of
// `.optional().or(z.literal(...))` or a bare `.optional()`.
export function optionalText(inner: z.ZodString) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), inner.optional());
}

// `z.coerce.number()` returns `ZodCoercedNumber`, a distinct branded type
// from a plain `ZodNumber` — this accepts either (and anything else chained
// off a coerced number, e.g. `.positive()`), not just the latter.
export function optionalNumber<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), inner.optional());
}
