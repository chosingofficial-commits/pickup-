-- Additive only: links a Refund to the specific order it's for (within a
-- possibly multi-vendor order group's shared Payment), so processing a
-- refund can correctly move that one order to REFUNDED and exclude it from
-- vendor/commission/rider earnings aggregates. Nullable — existing rows are
-- untouched; code falls back to matching `reason`'s "[orderNumber] ..."
-- prefix for refunds created before this column existed.

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN "orderId" TEXT;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
