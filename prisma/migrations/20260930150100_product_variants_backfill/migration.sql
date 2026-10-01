-- Data-only. Gives every existing product exactly one variant (its current
-- price/compare-at-price/stock, quantityValue=1 unit=PCS packCount=1 so it
-- renders as a plain "1 pc" size internally — the product page only shows a
-- size picker when a product has more than one *active* variant, so this
-- never surfaces anything new to a customer), then repoints existing cart
-- lines at it so nothing has variantId = NULL going forward. Historical
-- OrderItem rows are deliberately left untouched — they already carry their
-- own nameSnapshot/unitPriceSnapshot from checkout time, and attributing a
-- variant to them retroactively (one that didn't exist yet when the order
-- was placed) would misrepresent order history rather than clarify it.
--
-- No pgcrypto/uuid extension available (none is installed in this project,
-- see schema.prisma) — ids are generated with the built-in md5() instead.

INSERT INTO "ProductVariant"
  (id, "productId", name, "priceDelta", "stockQty", "isDefault",
   "quantityValue", unit, "packCount", price, "compareAtPrice", "isActive", "sortOrder")
SELECT
  'c' || substr(md5(p.id || clock_timestamp()::text || random()::text), 1, 24),
  p.id,
  'Default',
  0,
  COALESCE(i."quantityInStock", 0),
  true,
  1,
  'PCS',
  1,
  p.price,
  p."compareAtPrice",
  true,
  0
FROM "Product" p
LEFT JOIN "Inventory" i ON i."productId" = p.id
WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id);

UPDATE "CartItem" c
SET "variantId" = v.id
FROM "ProductVariant" v
WHERE c."variantId" IS NULL
  AND c."productId" IS NOT NULL
  AND v."productId" = c."productId"
  AND v."isDefault" = true;
