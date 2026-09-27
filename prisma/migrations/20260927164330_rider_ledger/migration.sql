-- CreateEnum
CREATE TYPE "RiderLedgerEntryType" AS ENUM ('DELIVERY_EARNING', 'DELIVERY_REVERSAL', 'CASH_HANDOVER', 'PAYOUT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "deliveryFeePoisha" INTEGER,
ADD COLUMN     "isCod" BOOLEAN,
ADD COLUMN     "orderTotalPoisha" INTEGER,
ADD COLUMN     "platformDeliverySharePoisha" INTEGER,
ADD COLUMN     "riderEarningPoisha" INTEGER,
ADD COLUMN     "riderRatePctSnapshot" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "standardDeliveryFeePoisha" INTEGER;

-- AlterTable
ALTER TABLE "RiderProfile" ADD COLUMN     "balancePoisha" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commissionRatePct" DECIMAL(5,2) NOT NULL DEFAULT 25;

-- CreateTable
CREATE TABLE "RiderLedgerEntry" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "type" "RiderLedgerEntryType" NOT NULL,
    "deliveryId" TEXT,
    "balanceImpactPoisha" INTEGER NOT NULL,
    "amountPoisha" INTEGER NOT NULL,
    "payoutMethod" TEXT,
    "referenceNo" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderLedgerEntry_idempotencyKey_key" ON "RiderLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RiderLedgerEntry_riderId_createdAt_idx" ON "RiderLedgerEntry"("riderId", "createdAt");

-- CreateIndex
CREATE INDEX "RiderLedgerEntry_deliveryId_idx" ON "RiderLedgerEntry"("deliveryId");

-- AddForeignKey
ALTER TABLE "RiderLedgerEntry" ADD CONSTRAINT "RiderLedgerEntry_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderLedgerEntry" ADD CONSTRAINT "RiderLedgerEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderLedgerEntry" ADD CONSTRAINT "RiderLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique indexes: at most one DELIVERY_EARNING and at most one
-- DELIVERY_REVERSAL row per delivery, no matter how many times "mark
-- delivered" (or a delivered order's refund/return) fires. Not expressible
-- in Prisma's schema DSL (no WHERE-qualified @@unique) — enforced here only.
CREATE UNIQUE INDEX "RiderLedgerEntry_delivery_earning_key" ON "RiderLedgerEntry" ("deliveryId") WHERE "type" = 'DELIVERY_EARNING';
CREATE UNIQUE INDEX "RiderLedgerEntry_delivery_reversal_key" ON "RiderLedgerEntry" ("deliveryId") WHERE "type" = 'DELIVERY_REVERSAL';
