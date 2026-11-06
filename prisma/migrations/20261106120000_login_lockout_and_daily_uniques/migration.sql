-- Login lockout + session revocation
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Entries saved without a shift are unique per day. PostgreSQL treats NULL
-- shiftIds as distinct, so the existing (shiftId, ...) unique keys don't cover them.
-- Partial indexes aren't expressible in schema.prisma; they live only here.
CREATE UNIQUE INDEX "NozzleReading_daily_no_shift_key" ON "NozzleReading"("nozzleId", "date") WHERE "shiftId" IS NULL;
CREATE UNIQUE INDEX "TankDip_daily_no_shift_key" ON "TankDip"("tankId", "date") WHERE "shiftId" IS NULL;
CREATE UNIQUE INDEX "SalesEntry_daily_no_shift_key" ON "SalesEntry"("branchId", "date") WHERE "shiftId" IS NULL;
