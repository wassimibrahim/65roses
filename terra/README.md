# Terra OS

**Education Capital Intelligence & Transaction Operating System.**

Internal software for Terra Capital, a Madrid education-sector investment advisory
firm. It exists to turn what the firm knows — about schools, families, property,
capital and relationships — into proprietary conversations.

It is not a CRM, not a directory and not a market data terminal. It answers five
questions: *what assets should Terra care about, why now, who should Terra
connect them with, how should the transaction be structured, and who can get
Terra into the room.*

See [PRODUCT.md](./PRODUCT.md) for the philosophy, the data model and the scoring
methodology.

---

## Running it locally

### Requirements

- Node 20 or later
- PostgreSQL 14 or later

No paid API keys are required. Every external integration has a mock
implementation behind an interface.

### Setup

```bash
cd terra
npm install

# 1. Create a database
createdb terra_os

# 2. Configure the environment
cp .env.example .env.local
#    Set DATABASE_URL, then generate a session secret:
#    openssl rand -base64 32

# 3. Create the schema and load the demo data
npm run db:push
npm run db:seed

# 4. Run
npm run dev            # http://localhost:3100
```

### Demo credentials

Local development only. The seed sets the same password for every account.

| Role             | Email                      | Password |
| ---------------- | -------------------------- | -------- |
| Managing Partner | `fouad@terracapital.es`    | `terra`  |
| Partner          | `elena@terracapital.es`    | `terra`  |
| Associate        | `tomas@terracapital.es`    | `terra`  |
| Analyst          | `sofia@terracapital.es`    | `terra`  |
| Administrator    | `admin@terracapital.es`    | `terra`  |

Sign in as the Managing Partner to see everything, or as the Analyst to see how
partner-confidential material and restricted processes are withheld.

### Scripts

| Command             | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Development server on port 3100                      |
| `npm run build`     | Production build (runs `prisma generate` first)      |
| `npm start`         | Serve the production build                           |
| `npm test`          | Vitest — the analytical engines and import rules     |
| `npm run typecheck` | `tsc --noEmit`                                       |
| `npm run db:push`   | Apply the Prisma schema to the database              |
| `npm run db:seed`   | Reset and reload the demo dataset                    |
| `npm run db:studio` | Prisma Studio                                        |

---

## Environment variables

| Variable                    | Required | Purpose                                                                 |
| --------------------------- | -------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`              | Yes      | PostgreSQL connection string                                            |
| `AUTH_SECRET`               | Yes      | Session encryption. `openssl rand -base64 32`                           |
| `AUTH_URL`                  | Yes      | Canonical URL of the deployment                                         |
| `NEXT_PUBLIC_APP_NAME`      | No       | Defaults to Terra OS                                                    |
| `NEXT_PUBLIC_DEMO_MODE`     | No       | Renders the illustrative-data discipline throughout the UI              |
| `NEXT_PUBLIC_MAPBOX_TOKEN`  | No       | Without it the origination map renders a schematic projection           |
| `LLM_PROVIDER`              | No       | `none` (default) keeps Terra Intelligence entirely local                |

**Confidential data is never sent to an external model unless `LLM_PROVIDER` is
explicitly configured.** With no provider set, Terra Intelligence answers
deterministically from the local database.

---

## Architecture

```
terra/
├── prisma/
│   ├── schema.prisma          ~45 models — see PRODUCT.md
│   ├── seed.ts                Demo seed orchestrator
│   ├── seed-transactions.ts   Opportunities, deals, interactions, matches
│   └── data/                  The demo dataset itself
├── src/
│   ├── app/
│   │   ├── (app)/             The eight modules, behind the shell
│   │   ├── (focus)/           Memo and IC view — no navigation
│   │   ├── api/export/        CSV endpoints, all audited
│   │   └── login/
│   ├── components/
│   │   ├── ui/                Primitives, including the provenance marks
│   │   ├── shell/             Sidebar, command palette, page header
│   │   └── …                  Module-specific components
│   ├── lib/
│   │   ├── engine/            Pure, tested analytical engines
│   │   ├── providers/         External integrations behind interfaces
│   │   └── …                  Formatting, CSV, RBAC helpers
│   └── server/                Data access; composes the engines with Prisma
└── tests/                     Vitest suites for the engines and import rules
```

### The layering that matters

**`src/lib/engine/` is pure.** Scoring, matching, underwriting, valuation,
returns, structures, legacy fit, the relationship graph and query intent have no
dependency on Prisma, React or Next.js. They take plain objects and return plain
objects, which is why they are unit-tested and why the underwriting model can run
in the browser and re-price as an analyst types.

**`src/server/` composes.** It reads through Prisma, shapes the input the engines
expect, and returns view models. `scoreUniverse()` is the single source of an
institution's score, so Command, Atlas, Origination and Underwriting can never
disagree about it.

**Authorisation lives in one place.** `src/lib/rbac.ts` is the only guard.
Components never decide what a user may see.

---

## Testing

```bash
npm test
```

115 tests covering opportunity scoring, buyer matching in both directions,
underwriting projections, valuation and comparable sets, IRR and MOIC, the
structure lab, founder-legacy fit, the relationship graph, query understanding
and the CSV import rules. Every engine is deterministic, so every test is exact
rather than approximate.

---

## Deployment

The application is a standard Next.js App Router build.

```bash
npm run build
npm start
```

It needs a PostgreSQL database and the environment variables above. On a
platform with managed Postgres, run `npx prisma migrate deploy` against the
production database as part of the release, and do not run the seed — it
truncates every table.

### Before a real deployment

The MVP is complete but two things are deliberately deferred:

- **Document storage** records metadata only. `src/lib/providers/storage.ts` is
  the interface a data room slots into.
- **CSV import** parses, maps, validates and detects duplicates, then stages
  rather than writes — the seeded market data is internally consistent and an
  import would break that. Enabling the write is a change to
  `src/app/actions/import.ts` alone.

---

`Confidential — Terra Capital`
