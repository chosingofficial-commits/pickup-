-- Step 1 of 2 (expand/contract) for removing the Upazila level.
-- This migration is purely additive: nothing is dropped, so the previous
-- application code (still running for a few minutes after `migrate deploy`
-- and before the new `next build` takes over) keeps working unchanged
-- against Town.upazilaId and the old unique index.
--
-- Step 2 (a later, separate migration, only after this is live and
-- verified) drops upazilaId, its old index, and the Upazila table.

-- 1. Add the new column, nullable for now — backfilled next.
ALTER TABLE "Town" ADD COLUMN "districtId" TEXT;

-- 2. Backfill every existing town from its current Upazila -> District chain.
UPDATE "Town" t
SET "districtId" = u."districtId"
FROM "Upazila" u
WHERE t."upazilaId" = u."id";

-- 3. Now that every existing row is backfilled, make it required.
ALTER TABLE "Town" ALTER COLUMN "districtId" SET NOT NULL;

-- 4. Add the FK to District.
ALTER TABLE "Town" ADD CONSTRAINT "Town_districtId_fkey"
  FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Add the new composite unique index. The old (upazilaId, slug) index is
--    left in place untouched — both are valid at once.
CREATE UNIQUE INDEX "Town_districtId_slug_key" ON "Town"("districtId", "slug");

-- 6. Make the old upazilaId column nullable so new towns (created by the
--    updated admin UI, which now picks a district directly) can omit it.
--    Existing rows keep their real historical upazilaId untouched.
ALTER TABLE "Town" ALTER COLUMN "upazilaId" DROP NOT NULL;
