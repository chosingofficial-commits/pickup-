-- Additive only: three new columns on Vendor (all with defaults matching
-- today's implicit behavior) and one new table. No existing table, column,
-- or row is touched -- Restaurant/RestaurantWeeklyHours are completely
-- untouched by this migration; restaurants keep working exactly as they do
-- today. A Vendor with zero VendorWeeklyHours rows (every existing grocery
-- shop, immediately after this deploys) is treated as open 24/7 by
-- lib/restaurant/status.ts's getRestaurantStatus() -- see that function's
-- empty-weeklyHours branch -- so nothing changes for any current shop.

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "isManuallyClosed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "temporaryClosureUntil" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN "scheduledOrderingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VendorWeeklyHours" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VendorWeeklyHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorWeeklyHours_vendorId_dayOfWeek_key" ON "VendorWeeklyHours"("vendorId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "VendorWeeklyHours" ADD CONSTRAINT "VendorWeeklyHours_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
