// First-time setup for a real station: creates the organization, station,
// fuels, tanks, dispensers/nozzles, optional opening rates, and the owner login.
// No demo records. Refuses to run if any user already exists, so it can never
// overwrite live data.
//
// Usage:
//   OWNER_EMAIL=you@example.com npm run db:setup -- prisma/station.json
// A temporary owner password is printed once; change it in Settings after login.

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const stationConfig = z.object({
  organization: z.object({ name: z.string().min(1), legalName: z.string().optional() }),
  station: z.object({
    name: z.string().min(1),
    company: z.string().min(1),
    city: z.string().min(1),
    managerName: z.string().min(1),
    varianceTolerancePct: z.number().min(0).max(100).default(1),
  }),
  owner: z.object({ name: z.string().min(1) }),
  products: z.array(z.object({ name: z.string().min(1), kind: z.enum(["FUEL", "LUBE"]) })).min(1),
  tanks: z
    .array(
      z.object({
        name: z.string().min(1),
        product: z.string().min(1),
        capacityL: z.number().positive(),
        safeLevelL: z.number().min(0),
      }),
    )
    .min(1),
  dispensers: z
    .array(
      z.object({
        label: z.string().min(1),
        nozzles: z.array(z.object({ label: z.string().min(1), tank: z.string().min(1) })).min(1),
      }),
    )
    .min(1),
  prices: z
    .array(
      z.object({
        product: z.string().min(1),
        rate: z.number().positive(),
        dealerMargin: z.number().positive(),
        effectiveFrom: isoDate,
      }),
    )
    .default([]),
});

export type StationConfig = z.infer<typeof stationConfig>;

const PKR = (rupees: number) => Math.round(rupees * 100);

async function main() {
  const configPath = process.argv[2] ?? "prisma/station.json";
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email || !z.string().email().safeParse(email).success) {
    throw new Error("Set OWNER_EMAIL to the owner's login email.");
  }
  const config = stationConfig.parse(JSON.parse(readFileSync(configPath, "utf8")));

  const prisma = new PrismaClient();
  try {
    if ((await prisma.user.count()) > 0) {
      throw new Error("Setup already done: users exist in this database. Nothing was changed.");
    }

    const tempPassword = randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: config.organization });
      const branch = await tx.branch.create({
        data: { organizationId: org.id, status: "Live", ...config.station },
      });

      const products = new Map<string, { id: string; kind: string }>();
      for (const p of config.products) {
        const row = await tx.product.upsert({
          where: { name: p.name },
          update: {},
          create: { name: p.name, kind: p.kind },
        });
        products.set(p.name, { id: row.id, kind: row.kind });
      }
      const fuel = (name: string) => {
        const p = products.get(name);
        if (!p || p.kind !== "FUEL") throw new Error(`"${name}" is not a fuel listed in products.`);
        return p.id;
      };

      const tanks = new Map<string, { id: string; productId: string }>();
      for (const t of config.tanks) {
        if (t.safeLevelL > t.capacityL) throw new Error(`${t.name}: safe level exceeds capacity.`);
        const row = await tx.tank.create({
          data: { branchId: branch.id, name: t.name, productId: fuel(t.product), capacityL: t.capacityL, safeLevelL: t.safeLevelL },
        });
        tanks.set(t.name, { id: row.id, productId: row.productId });
      }

      for (const d of config.dispensers) {
        const dispenser = await tx.dispenser.create({ data: { branchId: branch.id, label: d.label } });
        for (const n of d.nozzles) {
          const tank = tanks.get(n.tank);
          if (!tank) throw new Error(`${d.label} / ${n.label}: unknown tank "${n.tank}".`);
          await tx.nozzle.create({
            data: { branchId: branch.id, dispenserId: dispenser.id, productId: tank.productId, tankId: tank.id, label: n.label },
          });
        }
      }

      for (const p of config.prices) {
        if (p.dealerMargin >= p.rate) throw new Error(`${p.product}: margin must be lower than the rate.`);
        const ratePaisa = PKR(p.rate);
        const dealerMarginPaisaPerL = PKR(p.dealerMargin);
        await tx.fuelPrice.create({
          data: {
            branchId: branch.id,
            productId: fuel(p.product),
            ratePaisa,
            dealerMarginPaisaPerL,
            purchaseCostPaisaPerL: ratePaisa - dealerMarginPaisaPerL,
            effectiveFrom: p.effectiveFrom,
            source: "SETUP",
          },
        });
      }

      await tx.user.create({
        data: {
          email,
          name: config.owner.name,
          role: "Owner",
          passwordHash,
          branches: { create: [{ branchId: branch.id }] },
        },
      });
    });

    console.log(`Setup complete for "${config.station.name}".`);
    console.log(`Owner login: ${email}`);
    console.log(`Temporary password (shown once, change it in Settings): ${tempPassword}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
