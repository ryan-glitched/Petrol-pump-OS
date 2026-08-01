-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBranch" (
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBranch_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "varianceTolerancePct" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'LITRE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tank" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "capacityL" DOUBLE PRECISION NOT NULL,
    "safeLevelL" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispenser" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispenser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nozzle" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "dispenserId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nozzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "shiftSlot" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftSlot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "managerId" TEXT,
    "cashierId" TEXT,
    "fillers" TEXT,
    "guards" TEXT,
    "openingCashPaisa" INTEGER NOT NULL DEFAULT 0,
    "closingCashPaisa" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "shiftId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "duty" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("shiftId","staffId","duty")
);

-- CreateTable
CREATE TABLE "NozzleReading" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shiftId" TEXT,
    "nozzleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fuelPriceId" TEXT NOT NULL,
    "opening" DOUBLE PRECISION NOT NULL,
    "closing" DOUBLE PRECISION NOT NULL,
    "litres" DOUBLE PRECISION NOT NULL,
    "ratePaisa" INTEGER NOT NULL,
    "dealerMarginPaisaPerL" INTEGER NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "staffId" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NozzleReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankDip" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shiftId" TEXT,
    "tankId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openingDip" DOUBLE PRECISION NOT NULL,
    "closingDip" DOUBLE PRECISION NOT NULL,
    "litres" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TankDip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "quantityL" DOUBLE PRECISION NOT NULL,
    "ratePaisa" INTEGER NOT NULL,
    "costPaisa" INTEGER NOT NULL,
    "invoice" TEXT NOT NULL,
    "vehicle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shiftId" TEXT,
    "date" TEXT NOT NULL,
    "cashPaisa" INTEGER NOT NULL,
    "cardPaisa" INTEGER NOT NULL,
    "creditPaisa" INTEGER NOT NULL,
    "totalPaisa" INTEGER NOT NULL,
    "cashInHandPaisa" INTEGER NOT NULL,
    "diffPaisa" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilOilSale" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "purchasePaisa" INTEGER NOT NULL,
    "sellingPaisa" INTEGER NOT NULL,
    "profitPaisa" INTEGER NOT NULL,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilOilSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "paidBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCustomer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditSale" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shiftId" TEXT,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "litres" DOUBLE PRECISION NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "paidPaisa" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPayment" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "creditSaleId" TEXT,
    "date" TEXT NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPrice" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ratePaisa" INTEGER NOT NULL,
    "dealerMarginPaisaPerL" INTEGER NOT NULL,
    "purchaseCostPaisaPerL" INTEGER,
    "effectiveFrom" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "litres" DOUBLE PRECISION NOT NULL,
    "refId" TEXT,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianceLog" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "expectedL" DOUBLE PRECISION NOT NULL,
    "actualL" DOUBLE PRECISION NOT NULL,
    "varianceL" DOUBLE PRECISION NOT NULL,
    "variancePct" DOUBLE PRECISION NOT NULL,
    "flagged" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarianceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "branchId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "UserBranch_branchId_idx" ON "UserBranch"("branchId");

-- CreateIndex
CREATE INDEX "Branch_organizationId_status_idx" ON "Branch"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_organizationId_name_key" ON "Branch"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_kind_active_idx" ON "Product"("kind", "active");

-- CreateIndex
CREATE INDEX "Tank_branchId_productId_active_idx" ON "Tank"("branchId", "productId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Tank_branchId_name_key" ON "Tank"("branchId", "name");

-- CreateIndex
CREATE INDEX "Dispenser_branchId_active_idx" ON "Dispenser"("branchId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Dispenser_branchId_label_key" ON "Dispenser"("branchId", "label");

-- CreateIndex
CREATE INDEX "Nozzle_branchId_active_idx" ON "Nozzle"("branchId", "active");

-- CreateIndex
CREATE INDEX "Nozzle_tankId_idx" ON "Nozzle"("tankId");

-- CreateIndex
CREATE UNIQUE INDEX "Nozzle_dispenserId_label_key" ON "Nozzle"("dispenserId", "label");

-- CreateIndex
CREATE INDEX "Staff_branchId_active_role_idx" ON "Staff"("branchId", "active", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_branchId_employeeCode_key" ON "Staff"("branchId", "employeeCode");

-- CreateIndex
CREATE INDEX "Shift_branchId_date_status_idx" ON "Shift"("branchId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_branchId_date_shiftSlot_key" ON "Shift"("branchId", "date", "shiftSlot");

-- CreateIndex
CREATE INDEX "ShiftAssignment_staffId_idx" ON "ShiftAssignment"("staffId");

-- CreateIndex
CREATE INDEX "NozzleReading_branchId_date_idx" ON "NozzleReading"("branchId", "date");

-- CreateIndex
CREATE INDEX "NozzleReading_nozzleId_date_idx" ON "NozzleReading"("nozzleId", "date");

-- CreateIndex
CREATE INDEX "NozzleReading_fuelPriceId_idx" ON "NozzleReading"("fuelPriceId");

-- CreateIndex
CREATE UNIQUE INDEX "NozzleReading_shiftId_nozzleId_key" ON "NozzleReading"("shiftId", "nozzleId");

-- CreateIndex
CREATE INDEX "TankDip_branchId_tankId_date_idx" ON "TankDip"("branchId", "tankId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TankDip_shiftId_tankId_key" ON "TankDip"("shiftId", "tankId");

-- CreateIndex
CREATE INDEX "Delivery_branchId_date_idx" ON "Delivery"("branchId", "date");

-- CreateIndex
CREATE INDEX "Delivery_tankId_date_idx" ON "Delivery"("tankId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_branchId_invoice_key" ON "Delivery"("branchId", "invoice");

-- CreateIndex
CREATE UNIQUE INDEX "SalesEntry_shiftId_key" ON "SalesEntry"("shiftId");

-- CreateIndex
CREATE INDEX "SalesEntry_branchId_date_idx" ON "SalesEntry"("branchId", "date");

-- CreateIndex
CREATE INDEX "MobilOilSale_branchId_date_idx" ON "MobilOilSale"("branchId", "date");

-- CreateIndex
CREATE INDEX "Expense_branchId_date_category_idx" ON "Expense"("branchId", "date", "category");

-- CreateIndex
CREATE INDEX "CreditCustomer_branchId_active_idx" ON "CreditCustomer"("branchId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCustomer_branchId_name_vehicle_key" ON "CreditCustomer"("branchId", "name", "vehicle");

-- CreateIndex
CREATE INDEX "CreditSale_branchId_date_idx" ON "CreditSale"("branchId", "date");

-- CreateIndex
CREATE INDEX "CreditSale_customerId_status_dueDate_idx" ON "CreditSale"("customerId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "CreditPayment_branchId_date_idx" ON "CreditPayment"("branchId", "date");

-- CreateIndex
CREATE INDEX "CreditPayment_customerId_date_idx" ON "CreditPayment"("customerId", "date");

-- CreateIndex
CREATE INDEX "CreditPayment_creditSaleId_idx" ON "CreditPayment"("creditSaleId");

-- CreateIndex
CREATE INDEX "FuelPrice_branchId_effectiveFrom_idx" ON "FuelPrice"("branchId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "FuelPrice_productId_idx" ON "FuelPrice"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelPrice_branchId_productId_effectiveFrom_key" ON "FuelPrice"("branchId", "productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "StockMove_branchId_at_idx" ON "StockMove"("branchId", "at");

-- CreateIndex
CREATE INDEX "StockMove_tankId_at_idx" ON "StockMove"("tankId", "at");

-- CreateIndex
CREATE INDEX "StockMove_type_refId_idx" ON "StockMove"("type", "refId");

-- CreateIndex
CREATE INDEX "VarianceLog_branchId_date_flagged_idx" ON "VarianceLog"("branchId", "date", "flagged");

-- CreateIndex
CREATE UNIQUE INDEX "VarianceLog_branchId_tankId_date_key" ON "VarianceLog"("branchId", "tankId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_branchId_at_idx" ON "AuditLog"("branchId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_at_idx" ON "AuditLog"("userId", "at");

-- AddForeignKey
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispenser" ADD CONSTRAINT "Dispenser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "Dispenser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_fuelPriceId_fkey" FOREIGN KEY ("fuelPriceId") REFERENCES "FuelPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilOilSale" ADD CONSTRAINT "MobilOilSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilOilSale" ADD CONSTRAINT "MobilOilSale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCustomer" ADD CONSTRAINT "CreditCustomer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CreditCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_creditSaleId_fkey" FOREIGN KEY ("creditSaleId") REFERENCES "CreditSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianceLog" ADD CONSTRAINT "VarianceLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianceLog" ADD CONSTRAINT "VarianceLog_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain checks that Prisma cannot currently express in schema.prisma.
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_varianceTolerancePct_check"
  CHECK ("varianceTolerancePct" >= 0 AND "varianceTolerancePct" <= 100);

ALTER TABLE "Tank" ADD CONSTRAINT "Tank_levels_check"
  CHECK ("capacityL" > 0 AND "safeLevelL" >= 0 AND "safeLevelL" <= "capacityL");

ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_values_check"
  CHECK (
    "opening" >= 0 AND "closing" >= "opening" AND "litres" >= 0
    AND "ratePaisa" > 0 AND "dealerMarginPaisaPerL" >= 0
    AND "dealerMarginPaisaPerL" < "ratePaisa" AND "amountPaisa" >= 0
  );

ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_values_check"
  CHECK ("openingDip" >= 0 AND "closingDip" >= 0 AND "litres" >= 0);

ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_values_check"
  CHECK ("quantityL" > 0 AND "ratePaisa" >= 0 AND "costPaisa" >= 0);

ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_values_check"
  CHECK (
    "cashPaisa" >= 0 AND "cardPaisa" >= 0 AND "creditPaisa" >= 0
    AND "totalPaisa" = "cashPaisa" + "cardPaisa" + "creditPaisa"
    AND "cashInHandPaisa" >= 0
    AND "diffPaisa" = "cashInHandPaisa" - "cashPaisa"
  );

ALTER TABLE "MobilOilSale" ADD CONSTRAINT "MobilOilSale_values_check"
  CHECK (
    "qty" > 0 AND "purchasePaisa" >= 0 AND "sellingPaisa" >= 0
    AND "profitPaisa" = ("sellingPaisa" - "purchasePaisa") * "qty"
  );

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_check"
  CHECK ("amountPaisa" > 0);

ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_values_check"
  CHECK ("litres" > 0 AND "amountPaisa" > 0 AND "paidPaisa" >= 0 AND "paidPaisa" <= "amountPaisa");

ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_amount_check"
  CHECK ("amountPaisa" > 0);

ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_values_check"
  CHECK (
    "ratePaisa" > 0 AND "dealerMarginPaisaPerL" >= 0
    AND "dealerMarginPaisaPerL" < "ratePaisa"
    AND ("purchaseCostPaisaPerL" IS NULL OR "purchaseCostPaisaPerL" >= 0)
  );

ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_litres_check"
  CHECK ("litres" <> 0);

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "MobilOilSale" ADD CONSTRAINT "MobilOilSale_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_dates_format_check"
  CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND "dueDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_date_format_check" CHECK ("effectiveFrom" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "VarianceLog" ADD CONSTRAINT "VarianceLog_date_format_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
