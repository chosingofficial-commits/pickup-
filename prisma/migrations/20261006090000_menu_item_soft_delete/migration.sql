-- Additive only: one new nullable column. Old running code never references
-- it, so this is safe to apply while the previous build is still live.

-- Lets a menu item be hidden instead of hard-deleted when it has past
-- orders (hard-deleting it would violate OrderItem's FK and break order
-- history) — same pattern as Product.deletedAt.
ALTER TABLE "MenuItem" ADD COLUMN "deletedAt" TIMESTAMP(3);
