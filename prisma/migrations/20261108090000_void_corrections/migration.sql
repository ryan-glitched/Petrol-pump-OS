-- Void-and-re-enter: entries are never deleted; a voided entry keeps who/why and stops counting.
ALTER TABLE "NozzleReading" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidedById" TEXT, ADD COLUMN "voidReason" TEXT;
ALTER TABLE "TankDip" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidedById" TEXT, ADD COLUMN "voidReason" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidedById" TEXT, ADD COLUMN "voidReason" TEXT;
ALTER TABLE "SalesEntry" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidedById" TEXT, ADD COLUMN "voidReason" TEXT;
ALTER TABLE "Expense" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidedById" TEXT, ADD COLUMN "voidReason" TEXT;

-- Uniqueness applies only to live (not voided) entries, so a corrected entry can be re-entered.
-- Partial indexes aren't expressible in schema.prisma; they live only here.
DROP INDEX "NozzleReading_shiftId_nozzleId_key";
CREATE UNIQUE INDEX "NozzleReading_shiftId_nozzleId_key" ON "NozzleReading"("shiftId", "nozzleId") WHERE "voidedAt" IS NULL;
DROP INDEX "NozzleReading_daily_no_shift_key";
CREATE UNIQUE INDEX "NozzleReading_daily_no_shift_key" ON "NozzleReading"("nozzleId", "date") WHERE "shiftId" IS NULL AND "voidedAt" IS NULL;
CREATE INDEX "NozzleReading_shiftId_idx" ON "NozzleReading"("shiftId");

DROP INDEX "TankDip_shiftId_tankId_key";
CREATE UNIQUE INDEX "TankDip_shiftId_tankId_key" ON "TankDip"("shiftId", "tankId") WHERE "voidedAt" IS NULL;
DROP INDEX "TankDip_daily_no_shift_key";
CREATE UNIQUE INDEX "TankDip_daily_no_shift_key" ON "TankDip"("tankId", "date") WHERE "shiftId" IS NULL AND "voidedAt" IS NULL;
CREATE INDEX "TankDip_shiftId_idx" ON "TankDip"("shiftId");

DROP INDEX "Delivery_branchId_invoice_key";
CREATE UNIQUE INDEX "Delivery_branchId_invoice_key" ON "Delivery"("branchId", "invoice") WHERE "voidedAt" IS NULL;
CREATE INDEX "Delivery_branchId_invoice_idx" ON "Delivery"("branchId", "invoice");

DROP INDEX "SalesEntry_shiftId_key";
CREATE UNIQUE INDEX "SalesEntry_shiftId_key" ON "SalesEntry"("shiftId") WHERE "voidedAt" IS NULL;
DROP INDEX "SalesEntry_daily_no_shift_key";
CREATE UNIQUE INDEX "SalesEntry_daily_no_shift_key" ON "SalesEntry"("branchId", "date") WHERE "shiftId" IS NULL AND "voidedAt" IS NULL;
CREATE INDEX "SalesEntry_shiftId_idx" ON "SalesEntry"("shiftId");
