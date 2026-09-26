-- CreateEnum
CREATE TYPE "RegistrationPaymentMethod" AS ENUM ('BKASH', 'NAGAD', 'CASH');

-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN "paymentMethod" "RegistrationPaymentMethod";
ALTER TABLE "VendorApplication" ADD COLUMN "paymentReference" TEXT;
