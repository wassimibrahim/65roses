import "server-only";
import { db } from "@/lib/db";
import { loadOrgRelationshipStrength } from "@/server/matching";

export interface InvestorRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  hq: string | null;
  country: string | null;
  aum: number | null;
  countriesActive: string[];
  isPublicExample: boolean;
  activeMandates: number;
  totalMandates: number;
  relationship: number;
  lastConfirmed: Date | null;
  strongMatches: number;
  bestMatch: number;
  summary: string | null;
}

export async function loadInvestors(): Promise<InvestorRow[]> {
  const [organisations, strengths] = await Promise.all([
    db.organisation.findMany({
      where: { deletedAt: null },
      include: {
        mandates: {
          select: {
            id: true,
            isActive: true,
            lastConfirmed: true,
            matches: { select: { score: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    loadOrgRelationshipStrength(),
  ]);

  return organisations.map((o) => {
    const scores = o.mandates.flatMap((m) => m.matches.map((x) => x.score));
    const confirmed = o.mandates
      .map((m) => m.lastConfirmed)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime());
    return {
      id: o.id,
      slug: o.slug,
      name: o.name,
      type: o.type,
      hq: o.hq,
      country: o.country,
      aum: o.aum,
      countriesActive: o.countriesActive,
      isPublicExample: o.isPublicExample,
      activeMandates: o.mandates.filter((m) => m.isActive).length,
      totalMandates: o.mandates.length,
      relationship: strengths.get(o.id) ?? 1,
      lastConfirmed: confirmed[0] ?? null,
      strongMatches: scores.filter((s) => s >= 70).length,
      bestMatch: scores.length ? Math.max(...scores) : 0,
      summary: o.summary,
    };
  });
}

export async function loadInvestorProfile(slug: string) {
  const organisation = await db.organisation.findFirst({
    where: { slug, deletedAt: null },
    include: {
      mandates: {
        include: { criteria: true, owner: { select: { name: true } } },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      },
      people: { orderBy: { lastName: "asc" } },
      institutions: {
        select: { id: true, slug: true, name: true, city: true, country: true, students: true, type: true },
      },
      ownedProperties: { select: { id: true, name: true, city: true } },
      buyerEntries: {
        include: { deal: { select: { id: true, slug: true, codeName: true, stage: true } } },
      },
      interactions: {
        orderBy: { date: "desc" },
        include: {
          participants: {
            include: { person: { select: { id: true, slug: true, firstName: true, lastName: true, isInternal: true } } },
          },
          loggedBy: { select: { name: true } },
        },
      },
      relationships: {
        include: {
          fromPerson: {
            select: { id: true, slug: true, firstName: true, lastName: true, title: true, isInternal: true },
          },
          owner: { select: { name: true } },
        },
      },
      intelLinks: { include: { item: true } },
      documents: true,
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!organisation) return null;

  const strengths = await loadOrgRelationshipStrength();
  return { organisation, relationship: strengths.get(organisation.id) ?? 1 };
}

export function investorSummary(rows: InvestorRow[]) {
  return {
    count: rows.length,
    activeMandates: rows.reduce((a, r) => a + r.activeMandates, 0),
    withActive: rows.filter((r) => r.activeMandates > 0).length,
    aum: rows.reduce((a, r) => a + (r.aum ?? 0), 0),
    warmOrBetter: rows.filter((r) => r.relationship >= 4).length,
    staleMandates: rows.filter(
      (r) =>
        r.activeMandates > 0 &&
        (!r.lastConfirmed || Date.now() - r.lastConfirmed.getTime() > 180 * 86_400_000),
    ).length,
  };
}
