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

-- One surviving vehicle per (merged account, plate): point sales at it and drop the duplicates.
CREATE TEMP TABLE vehicle_merge AS
SELECT v."id" AS old_vid,
       first_value(v."id") OVER (PARTITION BY g.keep_id, v."plate" ORDER BY (v."customerId" = g.keep_id) DESC, v."id") AS keep_vid
FROM "CreditVehicle" v
JOIN (SELECT old_id AS cid, keep_id FROM customer_merge UNION SELECT keep_id, keep_id FROM customer_merge) g ON g.cid = v."customerId";
UPDATE "CreditSale" s SET "vehicleId" = vm.keep_vid FROM vehicle_merge vm WHERE s."vehicleId" = vm.old_vid AND vm.old_vid <> vm.keep_vid;
DELETE FROM "CreditVehicle" v USING vehicle_merge vm WHERE v."id" = vm.old_vid AND vm.old_vid <> vm.keep_vid;
DROP TABLE vehicle_merge;

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
