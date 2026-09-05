"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { scoreUniverse } from "@/server/scoring";
import { splitMatches, targetsForMandate, mandateProfilesWithRelationships } from "@/server/matching";
import { assessAccess } from "@/server/graph";
import { externalIntelligenceEnabled } from "@/lib/providers/llm";
import { planQuery, planIsEmpty, normalise } from "@/lib/engine/query-intent";

export interface QueryResultRow {
  label: string;
  sublabel?: string;
  href?: string;
  values: { key: string; value: string }[];
}

export interface QueryResult {
  /** What Terra understood the question to be asking. */
  interpretation: string;
  headline: string;
  rows: QueryResultRow[];
  /** The filters actually applied, so the answer is checkable. */
  criteria: string[];
  /** Present when the question could not be resolved. */
  suggestion?: string;
  provider: "deterministic" | "external";
}

/**
 * Deterministic natural-language querying over Terra's own records.
 *
 * Rule-based by choice: an investment committee needs an answer it can check,
 * and every result below is a query a partner could have written themselves.
 * Question understanding lives in src/lib/engine/query-intent.ts, where it is
 * pure and unit-tested; this module only fetches and shapes.
 */
export async function askTerra(question: string): Promise<QueryResult> {
  await requireUser();
  const q = question.trim();
  const provider = externalIntelligenceEnabled() ? ("external" as const) : ("deterministic" as const);

  if (q.length < 3) {
    return {
      interpretation: "",
      headline: "Ask a question about the database.",
      rows: [],
      criteria: [],
      provider,
    };
  }

  const plan = planQuery(q);
  const lower = normalise(q);

  switch (plan.intent) {
    case "INTRODUCTION_PATH": {
      const universe = await scoreUniverse();
      const target = universe.find((i) => lower.includes(normalise(i.name)));
      if (!target) {
        return unresolved(provider, "Name the institution you want a route to.");
      }
      const access = await assessAccess(target.id);
      const paths = [access.best, ...access.alternatives].filter(
        (p): p is NonNullable<typeof p> => p !== null,
      );
      return {
        interpretation: `Introduction routes to ${target.name}`,
        headline: access.best
          ? `${access.tier.replace(/_/g, " ").toLowerCase()} — ${access.best.narrative}`
          : "No route identified. An introduction would have to be manufactured.",
        criteria: [`Target: ${target.name}`, ...plan.criteria],
        rows: paths.map((path, index) => ({
          label: path.narrative,
          sublabel: `${path.degree} hop${path.degree === 1 ? "" : "s"} · weakest link ${path.weakestLink} of 5`,
          href: `/relationships?focus=${target.id}`,
          values: [
            { key: index === 0 ? "Best route" : "Alternative", value: `${path.degree} hops` },
          ],
        })),
        provider,
      };
    }

    case "MANDATES_FOR_ASSET": {
      const universe = await scoreUniverse();
      const target = universe.find((i) => lower.includes(normalise(i.name)));
      if (!target) return unresolved(provider, "Name the institution you want matched.");
      const { opco, propco } = await splitMatches(target);
      const all = [...opco, ...propco].filter((m) => m.isActive).sort((a, b) => b.score - a.score);
      return {
        interpretation: `Active mandates matching ${target.name}`,
        headline: `${all.length} live mandates fit, best score ${all[0]?.score ?? 0}.`,
        criteria: plan.criteria,
        rows: all.slice(0, 12).map((m) => ({
          label: m.organisationName,
          sublabel: m.mandateName,
          href: `/investors/id/${m.organisationId}`,
          values: [
            { key: "Fit", value: String(m.score) },
            { key: "Why", value: m.reasons.slice(0, 2).join("; ") || "—" },
            { key: "Issue", value: m.issues[0] ?? "—" },
          ],
        })),
        provider,
      };
    }

    case "TARGETS_FOR_MANDATE": {
      const mandates = await mandateProfilesWithRelationships();
      const mandate = mandates.find(
        (m) =>
          lower.includes(normalise(m.organisationName)) || lower.includes(normalise(m.mandateName)),
      );
      if (!mandate) return unresolved(provider, "Name the investor or operator whose mandate to run.");
      const targets = await targetsForMandate(mandate.id, { limit: 15 });
      return {
        interpretation: `Institutions matching ${mandate.organisationName} — ${mandate.mandateName}`,
        headline: `${targets.length} institutions clear the mandate criteria.`,
        criteria: [
          mandate.countries.length ? `Countries: ${mandate.countries.join(", ")}` : "Any country",
          mandate.segments.length
            ? `Segments: ${mandate.segments.map((s) => s.replace(/_/g, " ").toLowerCase()).join(", ")}`
            : "Any segment",
          ...plan.criteria,
        ],
        rows: targets.map((t) => ({
          label: t.institution.name,
          sublabel: [t.institution.city, t.institution.country].filter(Boolean).join(", "),
          href: `/atlas/${t.institution.slug}`,
          values: [
            { key: "Fit", value: String(t.score) },
            { key: "Students", value: String(t.institution.students ?? "—") },
            { key: "Terra score", value: String(t.institution.displayScore) },
          ],
        })),
        provider,
      };
    }

    case "COLD_RELATIONSHIPS": {
      const relationships = await db.relationship.findMany({
        where: {
          fromPerson: { isInternal: true },
          strength: { gte: 4 },
          lastInteractionAt: { lt: new Date(Date.now() - 45 * 86_400_000) },
          toPersonId: { not: null },
        },
        include: {
          fromPerson: { select: { firstName: true } },
          toPerson: {
            select: {
              slug: true, firstName: true, lastName: true,
              organisation: { select: { name: true } },
            },
          },
        },
        orderBy: { lastInteractionAt: "asc" },
        take: 20,
      });
      return {
        interpretation: "Strong relationships with no contact in the last 45 days",
        headline: `${relationships.length} relationships have gone quiet.`,
        criteria: plan.criteria,
        rows: relationships.map((r) => ({
          label: `${r.toPerson!.firstName} ${r.toPerson!.lastName}`,
          sublabel: r.toPerson!.organisation?.name ?? undefined,
          href: `/relationships/${r.toPerson!.slug}`,
          values: [
            {
              key: "Days",
              value: String(Math.floor((Date.now() - r.lastInteractionAt!.getTime()) / 86_400_000)),
            },
            { key: "Owner", value: r.fromPerson.firstName },
            { key: "Strength", value: String(r.strength) },
          ],
        })),
        provider,
      };
    }

    case "UNCONTACTED_OPPORTUNITIES": {
      const [universe, opportunities] = await Promise.all([
        scoreUniverse(),
        db.opportunity.findMany({ select: { institutionId: true } }),
      ]);
      const covered = new Set(opportunities.map((o) => o.institutionId));
      const rows = universe
        .filter((i) => !covered.has(i.id) && i.lastInteractionAt === null)
        .sort((a, b) => b.displayScore - a.displayScore)
        .slice(0, 15);
      return {
        interpretation: "High-scoring institutions with no opportunity and no logged contact",
        headline: `${rows.length} proprietary opportunities have never been approached.`,
        criteria: plan.criteria,
        rows: rows.map((i) => ({
          label: i.name,
          sublabel: [i.city, i.country].filter(Boolean).join(", "),
          href: `/atlas/${i.slug}`,
          values: [
            { key: "Score", value: String(i.displayScore) },
            { key: "Matches", value: String(i.strongMatchCount) },
            { key: "Access", value: i.accessTier.replace(/_/g, " ").toLowerCase() },
          ],
        })),
        provider,
      };
    }

    case "PRECEDENT_TRANSACTIONS": {
      const since = plan.sinceYear ? new Date(`${plan.sinceYear}-01-01`) : new Date("2000-01-01");
      const comps = await db.transactionComparable.findMany({
        where: {
          date: { gte: since },
          ...(plan.filters.country
            ? { country: { equals: plan.filters.country, mode: "insensitive" } }
            : {}),
        },
        orderBy: { date: "desc" },
      });
      return {
        interpretation: `Precedent transactions${plan.filters.country ? ` in ${plan.filters.country}` : ""}${plan.sinceYear ? ` since ${plan.sinceYear}` : ""}`,
        headline: `${comps.length} transactions in Terra's comparable set.`,
        criteria: plan.criteria,
        rows: comps.map((c) => ({
          label: `${c.buyer} / ${c.target}`,
          sublabel: `${c.country} · ${c.date.getFullYear()}`,
          href: "/underwriting/comparables",
          values: [
            { key: "EV", value: c.ev ? `€${(c.ev / 1_000_000).toFixed(0)}m` : "—" },
            { key: "EV/EBITDA", value: c.evEbitda ? `${c.evEbitda}×` : "—" },
            { key: "Real estate", value: c.realEstateIncluded ? "Included" : "Excluded" },
          ],
        })),
        provider,
      };
    }

    case "RECENT_CHANGES": {
      const since = new Date(Date.now() - 45 * 86_400_000);
      const [signals, moved] = await Promise.all([
        db.signal.findMany({
          where: { date: { gte: since } },
          include: { institution: { select: { slug: true, name: true, city: true } } },
          orderBy: { date: "desc" },
        }),
        db.auditLog.findMany({
          where: { entityType: "Opportunity", field: "stage", createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);
      const filtered = plan.filters.city
        ? signals.filter(
            (s) => normalise(s.institution?.city ?? "") === normalise(plan.filters.city!),
          )
        : signals;
      return {
        interpretation: `Changes in the last 45 days${plan.filters.city ? ` in ${plan.filters.city}` : ""}`,
        headline: `${filtered.length} new signals and ${moved.length} pipeline movements.`,
        criteria: plan.criteria,
        rows: [
          ...filtered.map((s) => ({
            label: s.headline,
            sublabel: s.institution?.name ?? s.entityLabel,
            href: s.institution ? `/atlas/${s.institution.slug}?tab=signals` : undefined,
            values: [
              { key: "Type", value: s.type.replace(/_/g, " ").toLowerCase() },
              { key: "Strength", value: s.strength.toLowerCase() },
              { key: "Date", value: s.date.toISOString().slice(0, 10) },
            ],
          })),
          ...moved.map((a) => ({
            label: a.context ?? "Opportunity moved",
            sublabel: `${a.previousValue} → ${a.newValue}`,
            href: "/origination",
            values: [{ key: "Changed", value: a.createdAt.toISOString().slice(0, 10) }],
          })),
        ],
        provider,
      };
    }

    case "INSTITUTION_SEARCH":
    default: {
      const universe = await scoreUniverse();
      const f = plan.filters;
      let rows = universe;

      if (f.city) rows = rows.filter((i) => normalise(i.city ?? "") === normalise(f.city!));
      if (f.country) rows = rows.filter((i) => normalise(i.country) === normalise(f.country!));
      if (f.ownership) rows = rows.filter((i) => f.ownership!.includes(i.ownershipType as never));
      if (f.ownedProperty) rows = rows.filter((i) => i.tenure === "OWNED" || i.tenure === "MIXED");
      if (f.succession) {
        rows = rows.filter((i) =>
          ["POTENTIAL_SUCCESSION_ISSUE", "TRANSITION_UNDERWAY", "FOUNDER_LED"].includes(
            i.successionStatus,
          ),
        );
      }
      if (f.segments) {
        rows = rows.filter(
          (i) =>
            f.segments!.includes(i.type) ||
            (f.segments!.includes("BILINGUAL_SCHOOL") && i.curriculum.includes("Bilingual")),
        );
      }
      if (f.minStudents !== undefined) rows = rows.filter((i) => (i.students ?? 0) > f.minStudents!);
      if (f.maxStudents !== undefined) {
        rows = rows.filter((i) => (i.students ?? Infinity) < f.maxStudents!);
      }

      const criteria = [...plan.criteria];

      if (planIsEmpty(plan)) {
        // Fall back to a name match rather than returning the whole universe.
        const words = lower.split(/\s+/).filter((w) => w.length > 3);
        rows = universe.filter((i) =>
          words.some((w) => normalise(`${i.name} ${i.city ?? ""} ${i.familyName ?? ""}`).includes(w)),
        );
        if (rows.length === 0) {
          return unresolved(
            provider,
            "This layer answers structured questions deterministically. Try naming a city, an ownership type, a segment, a student threshold, or a specific institution.",
          );
        }
        criteria.push("Name and location match");
      }

      const sorted = rows.sort((a, b) => b.displayScore - a.displayScore).slice(0, 25);
      return {
        interpretation: `Institutions matching ${criteria.length} ${criteria.length === 1 ? "criterion" : "criteria"}`,
        headline:
          rows.length === 0
            ? "Nothing in the Atlas matches every one of those criteria."
            : `${rows.length} institutions match, ${sorted.length} shown.`,
        criteria,
        rows: sorted.map((i) => ({
          label: i.name,
          sublabel: [i.city, i.country].filter(Boolean).join(", "),
          href: `/atlas/${i.slug}`,
          values: [
            { key: "Score", value: String(i.displayScore) },
            { key: "Students", value: String(i.students ?? "—") },
            { key: "Ownership", value: i.ownershipType.replace(/_/g, " ").toLowerCase() },
            { key: "Campus", value: i.tenure.toLowerCase() },
          ],
        })),
        provider,
      };
    }
  }
}

function unresolved(provider: "deterministic" | "external", suggestion: string): QueryResult {
  return {
    interpretation: "",
    headline: "Terra Intelligence could not resolve that question.",
    rows: [],
    criteria: [],
    suggestion,
    provider,
  };
}
