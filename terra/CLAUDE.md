# TERRA OS — working notes

This directory is a **separate application** from 65 Roses. The constitution in
the repository root (`../CLAUDE.md`) governs the 65 Roses membership world and
does **not** apply here — different product, different client, different design
language. Nothing in this directory imports from, or is imported by, `../src`.

Read `PRODUCT.md` before changing anything substantive, and `BUILD_STATUS.md`
for what is deliberately deferred.

## The rules that matter

**Never blur source and inference.** Fact, estimate, signal and Terra hypothesis
are four distinct classes and the UI marks them apart. An estimate must never be
rendered so that it reads as a reported figure. If you add a field that holds a
number Terra worked out rather than observed, it needs a basis or an assertion
class.

**Every score explains itself.** Scores, matches and structures return their
drivers, their detractors and the gaps in what was known. A number without its
workings is not usable in an investment committee, so do not add one.

**Judgment overrules the model, with a reason.** Overrides are allowed
everywhere; the rationale is mandatory and audited. That is how institutional
knowledge re-enters the system.

**The engines stay pure.** `src/lib/engine/` has no Prisma, React or Next.js
import. That is why it is testable and why the underwriting model can run in the
browser. Compose it in `src/server/`, never the other way round.

**One source of a score.** `scoreUniverse()` is it. Command, Atlas, Origination
and Underwriting must never be able to disagree about an institution's score.

**Authorisation lives in `src/lib/rbac.ts`.** Not in a component, not in the
browser. Restricted reads write an audit row.

**The operating company is not the campus.** Wherever an owned freehold is
valued, charge a market rent against the OpCo and capitalise the property
separately. Property mandates size-test against property value, not enterprise
value.

**Ranges, not false precision.** Valuations are ranges; comparable sets are
interquartile bands; transactions including real estate are never blended with
those excluding it.

## Conventions

- Money is EUR. `Float` in the database — adequate for estimates, and stated as
  a limitation in `BUILD_STATUS.md`.
- Tabular numerals everywhere a figure appears; the `.num` class handles it.
- No status colour beyond forest for conviction and burgundy for risk. No blue.
- Tabs are deep-linkable URLs (`?tab=`), not client state.
- New engine behaviour needs a test. `npm test` must stay green.

`Confidential — Terra Capital`
