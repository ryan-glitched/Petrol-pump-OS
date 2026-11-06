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

-- Collections recorded before payment tracking existed become payment rows, so statements match balances.
INSERT INTO "CreditPayment" ("id", "branchId", "customerId", "creditSaleId", "date", "amountPaisa", "method", "notes")
SELECT 'pay_' || "id", "branchId", "customerId", "id", "date", "paidPaisa", 'Other', 'Recorded before payment tracking'
FROM "CreditSale" WHERE "paidPaisa" > 0;

-- Old rows were one per (name, vehicle); merge rows with the same name (any case) into one account.
CREATE TEMP TABLE customer_merge AS
SELECT c."id" AS old_id, k.keep_id
FROM "CreditCustomer" c
JOIN (SELECT "branchId", lower("name") AS lname, min("id") AS keep_id FROM "CreditCustomer" GROUP BY 1, 2) k
  ON k."branchId" = c."branchId" AND k.lname = lower(c."name")
WHERE c."id" <> k.keep_id;

-- Same plate already on the kept account: point sales at that vehicle and drop the duplicate.
UPDATE "CreditSale" s SET "vehicleId" = keep_v."id"
FROM "CreditVehicle" v
JOIN customer_merge m ON m.old_id = v."customerId"
JOIN "CreditVehicle" keep_v ON keep_v."customerId" = m.keep_id AND keep_v."plate" = v."plate"
WHERE s."vehicleId" = v."id";
DELETE FROM "CreditVehicle" v USING customer_merge m, "CreditVehicle" keep_v
WHERE m.old_id = v."customerId" AND keep_v."customerId" = m.keep_id AND keep_v."plate" = v."plate";

UPDATE "CreditVehicle" v SET "customerId" = m.keep_id FROM customer_merge m WHERE v."customerId" = m.old_id;
UPDATE "CreditSale" s SET "customerId" = m.keep_id FROM customer_merge m WHERE s."customerId" = m.old_id;
UPDATE "CreditPayment" p SET "customerId" = m.keep_id FROM customer_merge m WHERE p."customerId" = m.old_id;
UPDATE "CreditCustomer" c SET "active" = true
WHERE c."id" IN (SELECT m.keep_id FROM customer_merge m JOIN "CreditCustomer" o ON o."id" = m.old_id WHERE o."active");
DELETE FROM "CreditCustomer" c USING customer_merge m WHERE c."id" = m.old_id;
DROP TABLE customer_merge;

DROP INDEX "CreditCustomer_branchId_name_vehicle_key";
ALTER TABLE "CreditCustomer" DROP COLUMN "vehicle";

CREATE UNIQUE INDEX "CreditVehicle_customerId_plate_key" ON "CreditVehicle"("customerId", "plate");
CREATE INDEX "CreditCustomer_branchId_name_idx" ON "CreditCustomer"("branchId", "name");
-- One account per customer name in a station (case-insensitive). Not expressible in schema.prisma.
CREATE UNIQUE INDEX "CreditCustomer_branchId_lower_name_key" ON "CreditCustomer"("branchId", lower("name"));
CREATE INDEX "CreditSale_vehicleId_idx" ON "CreditSale"("vehicleId");

ALTER TABLE "CreditVehicle" ADD CONSTRAINT "CreditVehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "CreditVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
