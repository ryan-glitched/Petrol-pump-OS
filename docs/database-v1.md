# PetrolPumpOS V1 Database

## Purpose

The V1 PostgreSQL database supports one real station today and multiple organizations and branches later. PostgreSQL is the source of truth; Excel becomes an import/export format rather than the operational database.

## Important design decisions

- Money is stored as integer paisa. For example, PKR 7.00 is stored as `700`.
- Every operational record is scoped to a branch and protected by a foreign key.
- Business dates are validated as `YYYY-MM-DD` in the branch timezone (`Asia/Karachi`).
- Fuel prices are effective-dated. Existing price rows are never overwritten.
- Every nozzle reading snapshots its selling price and dealer margin per litre.
- Tank movements and audit records are append-only ledgers.
- Unique constraints prevent duplicate shifts, invoices, readings, prices, and daily variance rows.

## Main model groups

| Area | Models |
| --- | --- |
| Tenant and access | `Organization`, `Branch`, `User`, `UserBranch` |
| Station setup | `Product`, `Tank`, `Dispenser`, `Nozzle`, `Staff` |
| Daily operations | `Shift`, `ShiftAssignment`, `NozzleReading`, `TankDip`, `Delivery` |
| Finance | `SalesEntry`, `Expense`, `MobilOilSale`, `CreditCustomer`, `CreditSale`, `CreditPayment` |
| Pricing and stock | `FuelPrice`, `StockMove`, `VarianceLog` |
| Accountability | `AuditLog` |

## Price and margin history

`FuelPrice` stores:

- pump selling price in paisa per litre;
- dealer margin in paisa per litre;
- calculated or supplied purchase cost;
- the date from which the values apply;
- source and notes.

When a nozzle reading is saved, it stores the applicable `fuelPriceId`, selling rate, and dealer margin. If the margin changes from PKR 7/L later, old profit reports remain unchanged.

## Safe schema changes

Never edit production tables manually. Use this process:

1. Create a feature branch.
2. Update `prisma/schema.prisma`.
3. Run `npm run db:migrate -- --name short_description` against a development database.
4. Review the generated SQL in `prisma/migrations`.
5. Run tests and test the migration on non-production data.
6. Back up production and run `npm run db:deploy`.
7. Commit the schema and migration together.

Adding a nullable field is usually low risk. Removing, renaming, or changing the type of a populated field requires a staged data migration.

## Current limitation

The V1 uses validated local-date strings to preserve compatibility with the existing interface. Before multi-country SaaS expansion, operational events should also receive an immutable UTC timestamp while retaining the station business date.
