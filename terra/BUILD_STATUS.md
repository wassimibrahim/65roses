# Terra OS — build status

Last verified: all 115 tests passing, production build clean, 66 routes returning
their expected status under an authenticated session.

---

## Complete

### Foundation
- [x] Next.js 15 App Router, TypeScript strict, Tailwind v4
- [x] Design system — warm ivory, charcoal, stone, forest for conviction,
      burgundy for risk, restrained gold. No fintech blue anywhere.
- [x] Serif display / sans UI / mono numerals; tabular figures throughout
- [x] Auth.js credentials with Argon-grade hashing, constant-time failure
- [x] Role-based access in a single server-side guard
- [x] App shell, sidebar, breadcrumbs, mobile navigation
- [x] Cmd/Ctrl+K global search across eight entity types
- [x] Print stylesheet for the memo and IC surfaces

### Data
- [x] Prisma schema, ~45 models
- [x] Evidence layer: assertion class, confidence, source, review date per field
- [x] Financial basis on every financial record
- [x] Historical ownership preserved with from/to dates
- [x] Audit log on every material change and restricted read
- [x] Demo seed: 41 institutions, 24 organisations, 19 mandates, 78 people,
      126 relationships, 51 interactions, 25 signals, 15 comparables,
      10 opportunities, 6 deals, 774 computed matches, 315 evidence records

### Engines (pure, tested, deterministic)
- [x] Terra Opportunity Score — six weighted dimensions, drivers, detractors, gaps
- [x] Match engine — ten dimensions, forward and reverse, symmetric
- [x] Underwriting — capacity-constrained, three scenarios, browser-resident
- [x] Valuation — comparable bands, DCF, property yield, sum-of-the-parts
- [x] Returns — MOIC, IRR, two sensitivity matrices
- [x] Structure lab — eight structures
- [x] Founder legacy fit — financial outcome against legacy preservation
- [x] Relationship graph — weighted BFS, access classification
- [x] Query intent — natural-language understanding for Terra Intelligence
- [x] CSV import rules — parsing, mapping inference, validation, duplicates

### Modules
- [x] **Command** — priority opportunities, deal pulse, follow-ups, signals, metrics
- [x] **Atlas** — filtered table, seven saved views, map, nine-tab institution profile
- [x] **Origination** — kanban and table, why-now enforcement, uncovered targets
- [x] **Investors** — mandate database, criteria, reverse match
- [x] **Deals** — deal rooms, buyer universe, process checklist, continuity
- [x] **Underwriting** — live model, valuation, returns, structure lab, comparables
- [x] **Relationships** — network graph, contacts, timelines, network advantage
- [x] **Intelligence** — market feed, signal feed, Terra Intelligence copilot
- [x] Settings — analytics, strategy and flywheel, data quality, team, audit, system

### Outputs
- [x] Opportunity memo — print-first, one page, with its sources
- [x] Investment committee view — no navigation, boardroom scale
- [x] "Find opportunity" — the composed transaction thesis
- [x] CSV export for institutions, contacts, comparables and buyer universes,
      each written to the audit log
- [x] CSV import with column mapping, preview, validation and duplicate detection

### Documentation
- [x] README — setup, environment, architecture, deployment, credentials
- [x] PRODUCT.md — philosophy, disciplines, data model, scoring methodology, roadmap
- [x] This file

---

## Deliberately deferred

These are choices, not omissions.

**Document storage records metadata only.** Uploading and serving files needs a
storage provider and a retention policy; the interface is in place at
`src/lib/providers/storage.ts` and no calling code would change.

**CSV import stages rather than writes.** The parse, mapping, validation and
duplicate detection are all real and tested. The final insert is withheld because
the seeded market data is internally consistent — every financial figure derives
from the same assumptions — and letting a CSV write into it would break that
coherence in the demo. The audit row says explicitly that the rows were staged.

**Terra Intelligence answers deterministically.** Every response is a query a
partner could have written, and shows the criteria it applied. The provider
interface is ready for a model, and refuses rather than falling back silently if
`LLM_PROVIDER` is set without a configured endpoint — a misconfigured deployment
cannot leak by accident.

**The map renders a schematic projection without a Mapbox token.** The geography
is real and every filter works; only the basemap is missing.

**Prisma migrations are not generated.** `db:push` is right for a project at this
stage. `prisma migrate dev` should be adopted at the first real deployment.

---

## Known limitations

- **Money is stored as `Float`.** Adequate for estimates and ranges, which is
  what this system holds. Anything that becomes a settlement figure should move
  to integer minor units or `Decimal`.
- **`scoreUniverse()` scores the whole universe on each request.** Correct and
  fast at 41 institutions with per-request caching. At a few thousand it wants a
  materialised score column, refreshed on write.
- **The relationship graph is loaded whole per request.** Right at this size;
  above roughly ten thousand edges it wants a bounded traversal in the database.
- **No end-to-end browser tests.** The engines and import rules are unit-tested
  and every route is smoke-tested for status; interaction paths (drag to change
  stage, editing model assumptions) are verified by hand.

---

## Next, in order of value

1. Write CSV imports into the database, behind a confirmation step
2. Prisma migrations and a seeded staging environment
3. Attach a data room behind the storage interface
4. Saved views the user can create, not only the seven seeded ones
5. Email and calendar ingestion to log interactions without typing them
6. Connect a model to Terra Intelligence under explicit configuration
7. Playwright coverage of the drag-and-drop and model-editing paths

---

`Confidential — Terra Capital`
