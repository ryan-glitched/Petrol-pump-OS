# PetrolPumpOS

PetrolPumpOS is a Next.js petrol pump ERP and analytics V1 for station operations, fuel inventory, reconciliation, reporting, and forecasting. It is being proven at one PGL station before becoming a multi-station SaaS product.

## Current capabilities

- Secure login with branch-scoped roles
- PostgreSQL database through Prisma
- Shift, nozzle-reading, tank-dip, delivery, sales, expense, lubricant, credit, and staff workflows
- Effective-dated fuel prices and dealer margin in PKR per litre
- Tank stock and book-vs-dip variance calculations
- Dashboard, CSV reports, audit logging, and forecasting preview
- Responsive interface that can be installed on a phone home screen
- Login lockout after 5 wrong passwords, self-service password change

Demo seed data is fictional and must not be confused with live pump records.

## Technology

- Next.js, React, TypeScript, and Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod validation
- Vitest

## Local setup

Requirements:

- Node.js 20 or newer
- A PostgreSQL database, local or managed

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and provide a real PostgreSQL `DATABASE_URL` and random `AUTH_SECRET`.

Create the tables, then either set up a real station (no demo records) or load fictional demo data:

```bash
npm run db:deploy

# Real station: copy the example layout, edit fuels/tanks/nozzles/rates, then run setup.
cp prisma/station.example.json prisma/station.json
OWNER_EMAIL=owner@example.com npm run db:setup -- prisma/station.json

# OR demo data (wipes the database; refuses if real users exist or NODE_ENV=production)
npm run db:seed
```

`db:setup` prints a one-time temporary owner password. Sign in and change it under Settings.

Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database commands

```bash
npm run prisma:generate
npm run db:migrate -- --name describe_the_change
npm run db:deploy
npm run db:status
npm run db:studio
npm run db:setup -- prisma/station.json
npm run db:seed
```

Read [docs/database-v1.md](docs/database-v1.md) before changing the production schema.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Git workflow

- `main`: stable release
- `dev`: tested integration version
- `codex/*` or `feature/*`: isolated work branches

Changes go from a feature branch to `dev`, and from stable `dev` to `main`. Database migrations must be committed alongside the schema change that created them.

## Project structure

```text
app/                 Next.js routes and server actions
components/          UI, forms, charts, and dashboard
lib/                 Domain rules, auth, queries, reports, and validation
prisma/              PostgreSQL schema, migrations, and demo seed
tests/               Business-rule tests
docs/                Design and operating documentation
```

## V1 boundary

This release is building the trustworthy operational core. Real AI recommendations, WhatsApp automation, subscription billing, and broad SaaS administration come after the real-data field trial.
