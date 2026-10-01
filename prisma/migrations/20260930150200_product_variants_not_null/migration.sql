-- Safe to enforce now: the previous migration already backfilled every
-- product with a variant (quantityValue/unit/price all set), and no
-- currently-deployed code path inserts a ProductVariant row at all, so
-- nothing can violate these constraints during the deploy window.
ALTER TABLE "ProductVariant" ALTER COLUMN "quantityValue" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "unit" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "price" SET NOT NULL;
