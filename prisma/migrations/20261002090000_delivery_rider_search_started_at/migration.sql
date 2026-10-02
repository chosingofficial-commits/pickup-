-- Additive, nullable column — safe to run while the old code (which never
-- references this column) is still live during the deploy window.
ALTER TABLE "Delivery" ADD COLUMN "riderSearchStartedAt" TIMESTAMP(3);

-- Backfill: any order already sitting at the status a rider would normally
-- see it at (PREPARING for a grocery vendor, READY_FOR_PICKUP for a
-- restaurant), with no rider yet, must not go invisible the moment the new
-- code starts requiring riderSearchStartedAt IS NOT NULL — mark it as
-- "already being searched for" so it stays visible to riders exactly as it
-- was before this deploy. Mirrors getAvailableAssignments()'s own filter.
UPDATE "Delivery" d
SET "riderSearchStartedAt" = now()
FROM "Order" o
JOIN "Vendor" v ON v.id = o."vendorId"
WHERE d."orderId" = o.id
  AND d."riderId" IS NULL
  AND d."riderSearchStartedAt" IS NULL
  AND (
    (o.status = 'PREPARING' AND v."businessType" = 'GROCERY_VENDOR')
    OR (o.status = 'READY_FOR_PICKUP' AND v."businessType" = 'RESTAURANT')
  );
