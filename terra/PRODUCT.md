# Terra OS — the product

## What this is for

Terra Capital advises founder-owned and family-owned education institutions,
operators, institutional investors and landlords, on M&A, ownership transitions,
growth capital, education real estate and the structures in between.

Today that knowledge lives partly in people's heads, inboxes and spreadsheets.
Terra OS exists so that it stops doing so — so that every school researched
improves the database, every conversation improves relationship intelligence,
every transaction improves valuation intelligence, and every mandate improves
matching.

The system's purpose is to answer one question each morning:

> **What is the highest-value conversation we should have today?**

## The five questions

Every feature serves one of these. A feature that serves none does not belong.

1. **What assets should Terra care about?** — Atlas, the Terra Opportunity Score
2. **Why now?** — signals, succession status, the "why now" an analyst must write
3. **Who should Terra connect them with?** — the match engine, forwards and back
4. **How should the transaction be structured?** — the structure lab, founder legacy
5. **Who can get Terra into the room?** — the relationship graph

---

## The disciplines the software enforces

### Source versus inference

The single rule the whole product rests on. Four classes, never blurred:

| Class                | Meaning                                  | Example                                   |
| -------------------- | ---------------------------------------- | ----------------------------------------- |
| **Fact**             | Something Terra can point at             | "Founded 1974" — from the school's site   |
| **Estimate**         | Terra's own arithmetic                   | "Revenue €9.9m" — from fees × enrolment   |
| **Signal**           | An observed event                        | "Non-family head appointed"               |
| **Terra hypothesis** | Terra's reading of a signal              | "Professionalisation may precede capital" |

`DataFieldEvidence` records the class, confidence, source and review date for a
single field of a single entity. Financial records carry a *basis* — reported,
management, Terra estimate, derived or market assumption — and an estimate is
never rendered to look like a reported figure. The Sources tab on every
institution shows exactly how much of the profile is load-bearing, and which
fields need re-verifying.

### Decision support, not decisions

Every score, match and structure is explainable and overridable. A partner may
overrule the model, but the rationale is mandatory and audited — that is how
judgment re-enters the system rather than leaving it.

The demo contains a worked example. Colegio Mirasierra scores 88 against the ISP
Spain mandate and 42 on Terra's own score: the model reads the asset correctly,
and the partner's note that the family has said directly they are not selling
overrules it.

### Ranges, not false precision

Valuations are ranges. Comparable sets are reported as interquartile bands.
Transactions where real estate was included are never blended with those where
it was not, because that changes the multiple materially.

### The operating company is not the campus

An education asset is usually two assets. A school that owns its campus charges
itself no rent, so its reported EBITDA is not what a buyer of the operating
company alone would underwrite. Terra OS charges a market rent against the OpCo
everywhere it is valued, capitalises the freehold separately at an institutional
yield, and ranks the two buyer universes apart. Property mandates are size-tested
against the property value, not the enterprise value.

---

## The modules

| Module            | Question it answers                                                    |
| ----------------- | ---------------------------------------------------------------------- |
| **Command**       | What deserves attention today                                          |
| **Atlas**         | What is in the market, and what do we actually know about it           |
| **Origination**   | Which of it should we act on, and why now                              |
| **Investors**     | Who has capital, for what, and what fits it                            |
| **Deals**         | What is live, who is in the process, what is blocking it               |
| **Underwriting**  | What is it worth, under which assumptions                              |
| **Relationships** | Who can introduce us                                                   |
| **Intelligence**  | What changed, and what do we read into it                              |

---

## Data model

~45 Prisma models. The relationships that matter:

- An **organisation** owns many **institutions**; an institution has many
  **campuses**; a campus may sit in a **property** owned by a separate entity.
  OpCo and PropCo are separable because that is the transaction Terra advises on.
- **OwnershipStake** carries `from` and `to` dates. Historical ownership is
  preserved rather than overwritten — who used to own a school is part of its
  story.
- A **person** relates to people, organisations and institutions through
  `Relationship`, with a strength from 1 (none) to 5 (trusted). The graph is
  built from these edges.
- An **investor mandate** has one `BuyerCriteria`. A **match** joins an
  institution to a mandate with a score and its full breakdown.
- A **deal** has many assets, participants, stage history, buyer-universe
  entries, process items and stakeholder-continuity rows.
- **DataFieldEvidence** attaches provenance to any field of any entity.
- **AuditLog** records who changed what, from what, to what.

---

## The engines

All in `src/lib/engine/`. Pure TypeScript, no framework dependency, unit-tested,
deterministic.

### Terra Opportunity Score™ (0–100)

Six weighted dimensions. Weights are stored in the database and normalised at
scoring time, so a firm that weights relationships more heavily than the default
can say so without a code change.

| Dimension                   | Default weight | What moves it                                                    |
| --------------------------- | -------------- | ---------------------------------------------------------------- |
| Strategic attractiveness    | 20%            | Market tier, curriculum, utilisation, reputation, scalability     |
| Financial quality           | 20%            | Growth, EBITDA margin, cash conversion, capex intensity           |
| Transaction likelihood      | 20%            | Succession, owner type, founder age, concentration, signals       |
| Buyer demand                | 15%            | Depth and quality of live mandate matches                         |
| Real-estate optionality     | 10%            | Tenure, property share of value, sale-leaseback, development      |
| Terra relationship advantage| 15%            | Best route strength, warm introduction, prior conversation        |

The score reports its **gaps** as well as its drivers: fields that were unknown
and defaulted are listed, so a high score built on thin evidence says so.

### Match engine

Ten dimensions — geography, size, segment, curriculum, strategic logic,
real-estate fit, ownership preference, mandate status, acquisition pattern and
Terra relationship. Forward (which buyers fit this school) and reverse (which
schools fit this mandate) run the *same* function, so the number Terra quotes a
founder is the number it quotes a buyer.

A hard mismatch is **capped, not hidden**: a disqualified match still appears
with the reason it failed.

### Underwriting

Enrolment is constrained by capacity — the defining feature of the sector.
Revenue is students × tuition plus ancillary; staff cost derives from the
student/teacher ratio; rent is charged below the pre-rent line and indexed.
Three scenarios move enrolment, pricing and cost growth around the base case.

The model runs in the browser. Opening assumptions are back-solved from the
institution's own record — teacher cost is derived from the observed margin — so
year one reconciles to the financial history instead of contradicting it.

### Valuation

Comparable multiples as interquartile bands, DCF as a cross-check, property
capitalised on rent and yield, and sum-of-the-parts as the default posture.

### Structure lab

Eight structures — full sale, OpCo sale, PropCo sale, sale-and-leaseback,
majority partnership, minority growth, recapitalisation, JV expansion — each with
founder proceeds, investor equity, rent implications, stake retained and an
illustrative second exit.

### Founder legacy fit

Founder-owned schools are rarely decided on price. Objectives are captured in the
founder's own ranking, and each structure is scored on two axes: financial
outcome, and legacy preservation. Re-ranking the objectives moves the answer.
The right structure for one founder is the wrong structure for another at exactly
the same price.

### Relationship graph

Weighted breadth-first search. A trusted hop costs 1, a cold hop costs 14, so the
engine prefers one strong introduction over three weak ones. Access is classified
as direct, warm introduction, second degree or cold — and the distribution of
that across the universe is **Terra Network Advantage**, the clearest single
measure of the firm's proprietary position.

---

## Roles

`MANAGING_PARTNER` · `PARTNER` · `ASSOCIATE` · `ANALYST` · `ADMIN`

Enforced in one server-side guard. Partner rank or above is required for
partner-confidential notes, restricted deals and the audit log. Opening a
restricted process writes an audit row.

---

## Roadmap

The MVP is internal and deliberately not a marketplace — Terra's value comes
partly from discretion.

- **Terra Network** — the proprietary graph of education ownership and capital,
  which the relationship model is already shaped for
- **Terra Signals** — automated origination intelligence; the `Signal` model and
  the market-data provider interface already exist for it
- **Terra Benchmarks** — proprietary operational and transaction benchmarks from
  the comparable set as it grows
- **Terra Capital Markets** — live mandate matching, which the match engine
  already supports in both directions
- **Terra Portfolio** — asset monitoring where Terra retains a role after close

Nearer term: writing CSV imports into the database, a real data room behind the
storage interface, and connecting a model to Terra Intelligence under an explicit
configuration that keeps confidential material inside.

---

`Confidential — Terra Capital`
