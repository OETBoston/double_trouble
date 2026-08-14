-- CreateEnum
CREATE TYPE "BlockedType" AS ENUM ('BIKE_LANE', 'BUS_LANE', 'FIRE_HYDRANT', 'CROSSWALK', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('COMMERCIAL_VEHICLE', 'RIDESHARE_DELIVERY', 'PERSONAL_VEHICLE', 'OTHER');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "blockedType" "BlockedType",
ADD COLUMN     "blockedTypeOther" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "vehicleType" "VehicleType",
ADD COLUMN     "vehicleTypeOther" TEXT;
