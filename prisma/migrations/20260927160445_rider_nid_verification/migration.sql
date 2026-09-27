-- AlterTable
ALTER TABLE "RiderProfile" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "licenseCheckedInOffice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationalIdDocKey" TEXT,
ADD COLUMN     "nationalIdNo" TEXT,
ADD COLUMN     "photoCheckedInOffice" BOOLEAN NOT NULL DEFAULT false;
