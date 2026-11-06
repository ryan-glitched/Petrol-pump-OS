-- Customer profile, billing cycle and opening balance
ALTER TABLE "CreditCustomer"
ADD COLUMN     "address" TEXT,
ADD COLUMN     "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "billingDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "creditLimitPaisa" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ntn" TEXT,
ADD COLUMN     "openingBalancePaisa" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openingDate" TEXT,
ADD COLUMN     "openingPaidPaisa" INTEGER NOT NULL DEFAULT 0;

-- Several vehicles per customer
CREATE TABLE "CreditVehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditVehicle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CreditSale" ADD COLUMN     "vehicleId" TEXT;

-- Keep existing data: each old customer row's single vehicle becomes a CreditVehicle, and its sales point at it.
INSERT INTO "CreditVehicle" ("id", "customerId", "plate")
SELECT 'veh_' || "id", "id", "vehicle" FROM "CreditCustomer" WHERE "vehicle" IS NOT NULL AND "vehicle" <> '';

UPDATE "CreditSale" s SET "vehicleId" = v."id"
FROM "CreditVehicle" v WHERE v."customerId" = s."customerId";

DROP INDEX "CreditCustomer_branchId_name_vehicle_key";
ALTER TABLE "CreditCustomer" DROP COLUMN "vehicle";

CREATE UNIQUE INDEX "CreditVehicle_customerId_plate_key" ON "CreditVehicle"("customerId", "plate");
CREATE INDEX "CreditCustomer_branchId_name_idx" ON "CreditCustomer"("branchId", "name");
CREATE INDEX "CreditSale_vehicleId_idx" ON "CreditSale"("vehicleId");

ALTER TABLE "CreditVehicle" ADD CONSTRAINT "CreditVehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "CreditVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
