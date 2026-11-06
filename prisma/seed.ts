// Deterministic seed: reproduces the PetrolPumpOS demo dataset on a real DB.
// Re-running it wipes and rebuilds the same data (same PRNG seed => same numbers).
//
// Demo login (all roles share the password below):
//   superadmin@pgl.local / owner@pgl.local / manager@pgl.local /
//   cashier@pgl.local / filler@pgl.local   —  password: "demo1234"

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---- deterministic PRNG (mulberry32) --------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
function jitter(base: number, pct: number): number {
  return base * (1 + (rand() * 2 - 1) * pct);
}

const PKR = (rupees: number) => Math.round(rupees * 100); // -> paisa

// ---- date helpers ---------------------------------------------------------
const TODAY = "2026-06-29";
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function dateRange(endIso: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endIso, -(count - 1 - i)));
}

const SHIFT_1 = "Shift 1 (6:00 AM - 6:00 PM)";
const SHIFT_2 = "Shift 2 (6:00 PM - 6:00 AM)";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the demo seed with NODE_ENV=production.");
  }
  if (process.env.DEMO_SEED !== "wipe") {
    throw new Error("The demo seed deletes ALL data. Re-run with DEMO_SEED=wipe on a throwaway database.");
  }
  const DEMO_EMAILS = ["superadmin@pgl.local", "owner@pgl.local", "manager@pgl.local", "cashier@pgl.local", "filler@pgl.local"];
  const realUsers = await prisma.user.count({ where: { email: { notIn: DEMO_EMAILS } } });
  const setupStations = await prisma.fuelPrice.count({ where: { source: "SETUP" } });
  if (realUsers > 0 || setupStations > 0) {
    throw new Error("Refusing to wipe a database that holds a real station (non-demo users or db:setup data).");
  }
  console.log("Resetting database...");
  // Order matters for FK integrity.
  await prisma.auditLog.deleteMany();
  await prisma.varianceLog.deleteMany();
  await prisma.stockMove.deleteMany();
  await prisma.creditPayment.deleteMany();
  await prisma.creditSale.deleteMany();
  await prisma.creditCustomer.deleteMany();
  await prisma.mobilOilSale.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.salesEntry.deleteMany();
  await prisma.tankDip.deleteMany();
  await prisma.nozzleReading.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.fuelPrice.deleteMany();
  await prisma.nozzle.deleteMany();
  await prisma.dispenser.deleteMany();
  await prisma.tank.deleteMany();
  await prisma.userBranch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.product.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.organization.deleteMany();

  // ---- organization + branches ------------------------------------------
  const organization = await prisma.organization.create({
    data: {
      name: "PGL Fuel Stations",
      legalName: "PGL Fuel Stations Pakistan",
    },
  });

  const main = await prisma.branch.create({
    data: {
      organizationId: organization.id,
      name: "PGL Main Station",
      company: "PGL / PARCO Gunvor Limited",
      city: "Pakistan",
      managerName: "Shahid Mohsin",
      status: "Live",
      varianceTolerancePct: 1.0,
    },
  });
  const future = await prisma.branch.create({
    data: {
      organizationId: organization.id,
      name: "Future Branch Template",
      company: "PGL / PARCO Gunvor Limited",
      city: "Future Expansion",
      managerName: "To be assigned",
      status: "Setup",
      varianceTolerancePct: 1.0,
    },
  });

  // ---- products -----------------------------------------------------------
  const hiSuper = await prisma.product.create({ data: { name: "Hi Super", kind: "FUEL" } });
  const hobc = await prisma.product.create({ data: { name: "HOBC", kind: "FUEL" } });
  const diesel = await prisma.product.create({ data: { name: "Diesel", kind: "FUEL" } });
  await prisma.product.create({ data: { name: "Mobil Oil", kind: "LUBE" } });

  // ---- tanks (main branch) ------------------------------------------------
  const tank1 = await prisma.tank.create({ data: { branchId: main.id, name: "Tank 1", productId: diesel.id, capacityL: 42000, safeLevelL: 12000 } });
  const tank2a = await prisma.tank.create({ data: { branchId: main.id, name: "Tank 2A", productId: hobc.id, capacityL: 21000, safeLevelL: 7000 } });
  const tank2b = await prisma.tank.create({ data: { branchId: main.id, name: "Tank 2B", productId: hiSuper.id, capacityL: 21000, safeLevelL: 6500 } });
  const tank3 = await prisma.tank.create({ data: { branchId: main.id, name: "Tank 3", productId: hiSuper.id, capacityL: 21000, safeLevelL: 6500 } });

  // ---- dispensers + nozzles ----------------------------------------------
  const nozzleSpecs: { label: string; productId: string; tankId: string; meter: number }[] = [];
  const dispenserDefs = [
    { label: "Dispenser 1", nozzles: [{ p: diesel.id, t: tank1.id }, { p: diesel.id, t: tank1.id }] },
    { label: "Dispenser 2", nozzles: [{ p: hobc.id, t: tank2a.id }, { p: hobc.id, t: tank2a.id }] },
    { label: "Dispenser 3", nozzles: [{ p: hiSuper.id, t: tank2b.id }, { p: hiSuper.id, t: tank2b.id }] },
    { label: "Dispenser 4", nozzles: [{ p: hiSuper.id, t: tank3.id }, { p: diesel.id, t: tank1.id }] },
  ];
  const nozzleRecords: { id: string; productId: string; tankId: string; meter: number }[] = [];
  for (const d of dispenserDefs) {
    const disp = await prisma.dispenser.create({ data: { branchId: main.id, label: d.label } });
    let n = 1;
    for (const nz of d.nozzles) {
      const created = await prisma.nozzle.create({
        data: { branchId: main.id, dispenserId: disp.id, productId: nz.p, tankId: nz.t, label: `Nozzle ${n}` },
      });
      nozzleRecords.push({ id: created.id, productId: nz.p, tankId: nz.t, meter: 100000 + Math.floor(rand() * 50000) });
      n++;
    }
  }
  void nozzleSpecs;

  // ---- staff --------------------------------------------------------------
  const staffDefs = [
    { name: "Ali Raza", role: "Manager", shiftSlot: "Shift 1", phone: "0300-0000001", status: "Present" },
    { name: "Bilal Khan", role: "Cashier", shiftSlot: "Shift 1", phone: "0300-0000002", status: "Present" },
    { name: "Hamza Ahmed", role: "Filler", shiftSlot: "Shift 1", phone: "0300-0000003", status: "Present" },
    { name: "Usman Tariq", role: "Filler", shiftSlot: "Shift 2", phone: "0300-0000004", status: "Off Duty" },
    { name: "Naveed Iqbal", role: "Filler", shiftSlot: "Shift 2", phone: "0300-0000005", status: "Present" },
    { name: "Guard A", role: "Guard", shiftSlot: "Shift 1", phone: "0300-0000006", status: "Present" },
    { name: "Guard B", role: "Guard", shiftSlot: "Shift 2", phone: "0300-0000007", status: "Off Duty" },
  ];
  const staff: { id: string; name: string; role: string }[] = [];
  for (const s of staffDefs) {
    const created = await prisma.staff.create({ data: { branchId: main.id, ...s } });
    staff.push({ id: created.id, name: created.name, role: created.role });
  }
  const manager = staff.find((s) => s.role === "Manager")!;
  const cashier = staff.find((s) => s.role === "Cashier")!;
  const fillers = staff.filter((s) => s.role === "Filler");

  // ---- users (auth) -------------------------------------------------------
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const userDefs = [
    { email: "superadmin@pgl.local", name: "Super Admin", role: "SuperAdmin", branches: [main.id, future.id] },
    { email: "owner@pgl.local", name: "Shahid Mohsin", role: "Owner", branches: [main.id, future.id] },
    { email: "manager@pgl.local", name: "Ali Raza", role: "Manager", branches: [main.id] },
    { email: "cashier@pgl.local", name: "Bilal Khan", role: "Cashier", branches: [main.id] },
    { email: "filler@pgl.local", name: "Hamza Ahmed", role: "Filler", branches: [main.id] },
  ];
  for (const u of userDefs) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        branches: { create: u.branches.map((branchId) => ({ branchId })) },
      },
    });
  }

  // ---- fuel prices (with a mid-range change to exercise history) ----------
  const start = addDays(TODAY, -21);
  const DEALER_MARGIN_PAISA_PER_L = PKR(7);
  const priceDefs = [
    { productId: hiSuper.id, rate: 168, changeRate: 170, changeOn: addDays(TODAY, -10) },
    { productId: hobc.id, rate: 198, changeRate: 200, changeOn: addDays(TODAY, -10) },
    { productId: diesel.id, rate: 121, changeRate: 122.5, changeOn: addDays(TODAY, -10) },
  ];
  const pricesByProduct = new Map<
    string,
    Array<{
      id: string;
      ratePaisa: number;
      dealerMarginPaisaPerL: number;
      purchaseCostPaisaPerL: number | null;
      effectiveFrom: string;
    }>
  >();
  for (const p of priceDefs) {
    const first = await prisma.fuelPrice.create({
      data: {
        branchId: main.id,
        productId: p.productId,
        ratePaisa: PKR(p.rate),
        dealerMarginPaisaPerL: DEALER_MARGIN_PAISA_PER_L,
        purchaseCostPaisaPerL: PKR(p.rate) - DEALER_MARGIN_PAISA_PER_L,
        effectiveFrom: start,
        source: "DEMO_SEED",
      },
    });
    const changed = await prisma.fuelPrice.create({
      data: {
        branchId: main.id,
        productId: p.productId,
        ratePaisa: PKR(p.changeRate),
        dealerMarginPaisaPerL: DEALER_MARGIN_PAISA_PER_L,
        purchaseCostPaisaPerL: PKR(p.changeRate) - DEALER_MARGIN_PAISA_PER_L,
        effectiveFrom: p.changeOn,
        source: "DEMO_SEED",
      },
    });
    pricesByProduct.set(p.productId, [first, changed]);
  }
  function priceOn(productId: string, date: string) {
    const prices = pricesByProduct.get(productId) ?? [];
    return prices.filter((price) => price.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  }

  // ---- daily operational loop --------------------------------------------
  const days = dateRange(TODAY, 22);
  // opening dips (litres in tank at the very first morning)
  const dipLevel: Record<string, number> = {
    [tank1.id]: 19000,
    [tank2a.id]: 9000,
    [tank2b.id]: 14000,
    [tank3.id]: 15000,
  };
  const baseDailyLitres: Record<string, number> = {
    [tank1.id]: 3400, // diesel across 3 nozzles
    [tank2a.id]: 2100,
    [tank2b.id]: 1900,
    [tank3.id]: 1800,
  };

  let deliveryCounter = 7780;
  for (let di = 0; di < days.length; di++) {
    const date = days[di];

    // Opening dip = the level at the very start of the day, before any deliveries,
    // so book-vs-dip variance is expected = opening + deliveries - sold.
    const openingDipByTank: Record<string, number> = {
      [tank1.id]: dipLevel[tank1.id],
      [tank2a.id]: dipLevel[tank2a.id],
      [tank2b.id]: dipLevel[tank2b.id],
      [tank3.id]: dipLevel[tank3.id],
    };

    // Periodic deliveries to top up tanks before they run dry.
    const deliveriesToday: Record<string, number> = {};
    for (const t of [tank1, tank2a, tank2b, tank3]) {
      if (dipLevel[t.id] < t.safeLevelL * 1.4 && rand() > 0.3) {
        const qty = t.id === tank1.id ? 24000 : 12000;
        const productId = t.productId;
        const fuelPrice = priceOn(productId, date);
        if (!fuelPrice) throw new Error(`Missing fuel price for ${productId} on ${date}`);
        const costRate = fuelPrice.purchaseCostPaisaPerL ?? fuelPrice.ratePaisa - fuelPrice.dealerMarginPaisaPerL;
        const delivery = await prisma.delivery.create({
          data: {
            branchId: main.id,
            date,
            supplier: "PARCO",
            productId,
            tankId: t.id,
            quantityL: qty,
            ratePaisa: costRate,
            costPaisa: costRate * qty,
            invoice: `PGL-${deliveryCounter++}`,
          },
        });
        await prisma.stockMove.create({ data: { branchId: main.id, tankId: t.id, type: "DELIVERY", litres: qty, refId: delivery.id, at: new Date(`${date}T05:00:00Z`) } });
        deliveriesToday[t.id] = (deliveriesToday[t.id] ?? 0) + qty;
        dipLevel[t.id] += qty;
      }
    }

    const soldByTank: Record<string, number> = {};
    for (const shiftSlot of [SHIFT_1, SHIFT_2]) {
      const shift = await prisma.shift.create({
        data: {
          branchId: main.id,
          date,
          shiftSlot,
          managerId: manager.id,
          cashierId: cashier.id,
          fillers: fillers.map((f) => f.name).join(", "),
          guards: "Guard A, Guard B",
          openingCashPaisa: PKR(50000),
          closingCashPaisa: PKR(50000),
        },
      });

      let shiftCash = 0;
      let shiftCard = 0;
      let shiftCredit = 0;

      for (const nz of nozzleRecords) {
        const tankDaily = baseDailyLitres[nz.tankId] ?? 1800;
        // split a tank's daily litres across its nozzles and two shifts
        const nozzlesForTank = nozzleRecords.filter((x) => x.tankId === nz.tankId).length;
        const litres = Math.max(0, Math.round(jitter(tankDaily / nozzlesForTank / 2, 0.18)));
        const opening = nz.meter;
        const closing = opening + litres;
        nz.meter = closing;
        const fuelPrice = priceOn(nz.productId, date);
        if (!fuelPrice) throw new Error(`Missing fuel price for ${nz.productId} on ${date}`);
        const amount = fuelPrice.ratePaisa * litres;
        const filler = fillers[Math.floor(rand() * fillers.length)];
        const reading = await prisma.nozzleReading.create({
          data: {
            branchId: main.id,
            shiftId: shift.id,
            nozzleId: nz.id,
            productId: nz.productId,
            fuelPriceId: fuelPrice.id,
            opening,
            closing,
            litres,
            ratePaisa: fuelPrice.ratePaisa,
            dealerMarginPaisaPerL: fuelPrice.dealerMarginPaisaPerL,
            amountPaisa: amount,
            staffId: filler.id,
            date,
          },
        });
        soldByTank[nz.tankId] = (soldByTank[nz.tankId] ?? 0) + litres;
        await prisma.stockMove.create({ data: { branchId: main.id, tankId: nz.tankId, type: "SALE", litres: -litres, refId: reading.id, at: new Date(`${date}T${shiftSlot === SHIFT_1 ? "18" : "23"}:00:00Z`) } });

        // payment split for this nozzle's amount
        const cashShare = 0.55 + rand() * 0.1;
        const cardShare = 0.3 + rand() * 0.08;
        shiftCash += Math.round(amount * cashShare);
        shiftCard += Math.round(amount * cardShare);
        shiftCredit += amount - Math.round(amount * cashShare) - Math.round(amount * cardShare);
      }

      const total = shiftCash + shiftCard + shiftCredit;
      // most shifts reconcile within a few hundred rupees
      const diff = Math.round((rand() * 2 - 1) * 250) * 100;
      await prisma.salesEntry.create({
        data: {
          branchId: main.id,
          shiftId: shift.id,
          date,
          cashPaisa: shiftCash,
          cardPaisa: shiftCard,
          creditPaisa: shiftCredit,
          totalPaisa: total,
          cashInHandPaisa: shiftCash + diff,
          diffPaisa: diff,
        },
      });
    }

    // ---- daily tank dips + variance log ----------------------------------
    for (const t of [tank1, tank2a, tank2b, tank3]) {
      const openingDip = openingDipByTank[t.id];
      const sold = soldByTank[t.id] ?? 0;
      const deliveries = deliveriesToday[t.id] ?? 0;
      const expectedClosing = openingDip + deliveries - sold;
      // Seeded anomaly: Diesel (tank1) shrinkage on the most recent two days.
      const anomaly = t.id === tank1.id && di >= days.length - 2;
      const noisePct = anomaly ? -0.028 : (rand() * 2 - 1) * 0.004;
      const actualClosing = Math.max(0, Math.round(expectedClosing + (sold + deliveries) * noisePct));
      const closingDip = actualClosing;

      await prisma.tankDip.create({
        data: {
          branchId: main.id,
          tankId: t.id,
          date,
          openingDip,
          closingDip,
          litres: Math.max(0, openingDip - closingDip),
          notes: anomaly ? "Recheck nozzle calibration" : undefined,
          // Closing dip is taken after the day's last sales, so tank levels anchor on it correctly.
          createdAt: new Date(`${date}T23:59:00Z`),
        },
      });

      const varianceL = actualClosing - expectedClosing;
      const throughput = Math.abs(sold) + Math.abs(deliveries);
      const variancePct = throughput > 0 ? (varianceL / throughput) * 100 : 0;
      await prisma.varianceLog.create({
        data: {
          branchId: main.id,
          tankId: t.id,
          date,
          expectedL: Math.round(expectedClosing),
          actualL: actualClosing,
          varianceL: Math.round(varianceL),
          variancePct: Math.round(variancePct * 100) / 100,
          flagged: Math.abs(variancePct) > main.varianceTolerancePct,
        },
      });

      dipLevel[t.id] = closingDip;
    }

    // ---- expenses (subset of days) ---------------------------------------
    if (rand() > 0.4) {
      const cats = ["Utilities", "Maintenance", "Staff", "Office", "Other"];
      const cat = cats[Math.floor(rand() * cats.length)];
      await prisma.expense.create({
        data: {
          branchId: main.id,
          date,
          category: cat,
          amountPaisa: PKR(Math.round(jitter(12000, 0.5))),
          paidBy: rand() > 0.5 ? "Manager" : "Cashier",
          description: `${cat} expense`,
        },
      });
    }

    // ---- mobil oil sale (subset) -----------------------------------------
    if (rand() > 0.5) {
      const products = ["Mobil Super 1000", "Mobil Delvac MX"];
      const pname = products[Math.floor(rand() * products.length)];
      const qty = 8 + Math.floor(rand() * 14);
      const purchase = PKR(1800 + Math.floor(rand() * 1200));
      const selling = Math.round(purchase * 1.25);
      const staffMember = staff[Math.floor(rand() * staff.length)];
      await prisma.mobilOilSale.create({
        data: {
          branchId: main.id,
          date,
          productName: pname,
          qty,
          purchasePaisa: purchase,
          sellingPaisa: selling,
          profitPaisa: (selling - purchase) * qty,
          staffId: staffMember.id,
        },
      });
    }
  }

  // ---- credit customers + sales ------------------------------------------
  const creditDefs = [
    { name: "Alpha Logistics", vehicle: "LES-4471", productId: diesel.id, litres: 780, rate: 122.5, status: "Due", dueDate: addDays(TODAY, 6), paidPct: 0 },
    { name: "City Traders", vehicle: "ICT-2210", productId: hiSuper.id, litres: 260, rate: 170, status: "Partial", dueDate: addDays(TODAY, 3), paidPct: 0.4 },
    { name: "Mohsin Farms", vehicle: "RIN-8872", productId: diesel.id, litres: 1180, rate: 122.5, status: "Paid", dueDate: addDays(TODAY, 1), paidPct: 1 },
  ];
  for (const c of creditDefs) {
    const customer = await prisma.creditCustomer.create({
      data: { branchId: main.id, name: c.name, vehicles: { create: [{ plate: c.vehicle }] } },
      include: { vehicles: true },
    });
    const amount = PKR(c.litres * c.rate);
    const sale = await prisma.creditSale.create({
      data: {
        branchId: main.id,
        customerId: customer.id,
        vehicleId: customer.vehicles[0].id,
        productId: c.productId,
        date: TODAY,
        litres: c.litres,
        amountPaisa: amount,
        paidPaisa: Math.round(amount * c.paidPct),
        status: c.status,
        dueDate: c.dueDate,
      },
    });
    if (sale.paidPaisa > 0) {
      await prisma.creditPayment.create({
        data: { branchId: main.id, customerId: customer.id, creditSaleId: sale.id, date: TODAY, amountPaisa: sale.paidPaisa, method: "Cash" },
      });
    }
  }

  const counts = {
    branches: await prisma.branch.count(),
    users: await prisma.user.count(),
    shifts: await prisma.shift.count(),
    nozzleReadings: await prisma.nozzleReading.count(),
    salesEntries: await prisma.salesEntry.count(),
    varianceFlags: await prisma.varianceLog.count({ where: { flagged: true } }),
  };
  console.log("Seed complete:", counts);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
