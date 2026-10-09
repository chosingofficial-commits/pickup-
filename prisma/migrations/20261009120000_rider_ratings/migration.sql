-- Additive only: a new table for customer ratings of the rider who
-- delivered their order. No existing table or column is touched.

-- CreateTable
CREATE TABLE "RiderRating" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderRating_orderId_key" ON "RiderRating"("orderId");

-- CreateIndex
CREATE INDEX "RiderRating_riderId_idx" ON "RiderRating"("riderId");

-- AddForeignKey
ALTER TABLE "RiderRating" ADD CONSTRAINT "RiderRating_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderRating" ADD CONSTRAINT "RiderRating_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderRating" ADD CONSTRAINT "RiderRating_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
