import "server-only";
import { db } from "@/lib/db";
import { scoredInstitutionBySlug, type ScoredInstitution } from "@/server/scoring";
import { splitMatches, type NamedMatch } from "@/server/matching";
import { assessAccess, type AccessAssessment } from "@/server/graph";

export interface InstitutionProfile {
  scored: ScoredInstitution;
  record: NonNullable<Awaited<ReturnType<typeof loadRecord>>>;
  matches: { opco: NamedMatch[]; propco: NamedMatch[]; excluded: NamedMatch[] };
  access: AccessAssessment;
}

async function loadRecord(slug: string) {
  return db.educationInstitution.findFirst({
    where: { slug, deletedAt: null },
    include: {
      campuses: { orderBy: { isPrimary: "desc" } },
      properties: true,
      financials: { orderBy: { year: "asc" } },
      ownershipStakes: { orderBy: [{ to: "asc" }, { percentage: "desc" }] },
      valuations: { orderBy: { createdAt: "asc" } },
      structures: true,
      projections: true,
      riskFlags: { orderBy: { severity: "desc" } },
      signals: {
        orderBy: { date: "desc" },
        include: { source: { select: { name: true, url: true } } },
      },
      opportunities: { include: { owner: { select: { name: true } } } },
      founderProfile: {
        include: {
          founderPerson: { select: { id: true, slug: true, firstName: true, lastName: true, title: true } },
          objectives: { orderBy: { rank: "asc" } },
        },
      },
      organisation: { select: { id: true, slug: true, name: true, type: true } },
      documents: { orderBy: { createdAt: "desc" } },
      dealAssets: { include: { deal: { select: { id: true, slug: true, codeName: true, stage: true } } } },
      intelLinks: { include: { item: true } },
      interactions: {
        orderBy: { date: "desc" },
        include: {
          loggedBy: { select: { name: true } },
          participants: {
            include: { person: { select: { id: true, slug: true, firstName: true, lastName: true, title: true, isInternal: true } } },
          },
        },
      },
      relationships: {
        include: {
          fromPerson: {
            select: {
              id: true, slug: true, firstName: true, lastName: true, title: true, isInternal: true,
              organisation: { select: { name: true, slug: true } },
            },
          },
          owner: { select: { name: true } },
        },
      },
    },
  });
}

export async function loadInstitutionProfile(slug: string): Promise<InstitutionProfile | null> {
  const [scored, record] = await Promise.all([scoredInstitutionBySlug(slug), loadRecord(slug)]);
  if (!scored || !record) return null;
  const [matches, access] = await Promise.all([splitMatches(scored), assessAccess(scored.id)]);
  return { scored, record, matches, access };
}

/** Field-level provenance for the Sources tab and inline confidence marks. */
export async function loadEvidence(entityId: string) {
  return db.dataFieldEvidence.findMany({
    where: { entityType: "EducationInstitution", entityId },
    include: { source: { select: { name: true, url: true, kind: true } } },
    orderBy: { field: "asc" },
  });
}

export async function evidenceByField(entityId: string) {
  const rows = await loadEvidence(entityId);
  return new Map(rows.map((r) => [r.field, r]));
}

/** Comparables relevant to one institution — same country, same or adjacent segment. */
export async function relevantComparables(institution: ScoredInstitution) {
  const ADJACENT: Record<string, string[]> = {
    K12: ["K12", "BILINGUAL_SCHOOL", "INTERNATIONAL_SCHOOL", "BRITISH_SCHOOL"],
    BILINGUAL_SCHOOL: ["BILINGUAL_SCHOOL", "K12", "INTERNATIONAL_SCHOOL"],
    INTERNATIONAL_SCHOOL: ["INTERNATIONAL_SCHOOL", "BRITISH_SCHOOL", "K12", "IB_SCHOOL"],
    BRITISH_SCHOOL: ["BRITISH_SCHOOL", "INTERNATIONAL_SCHOOL", "K12"],
    VOCATIONAL: ["VOCATIONAL", "HIGHER_EDUCATION", "TRAINING"],
    HIGHER_EDUCATION: ["HIGHER_EDUCATION", "BUSINESS_SCHOOL", "UNIVERSITY"],
    BUSINESS_SCHOOL: ["BUSINESS_SCHOOL", "HIGHER_EDUCATION"],
    EARLY_YEARS: ["EARLY_YEARS", "K12"],
  };
  const segments = ADJACENT[institution.type] ?? [institution.type];
  return db.transactionComparable.findMany({
    where: { segment: { in: segments as never[] } },
    orderBy: { date: "desc" },
  });
}
