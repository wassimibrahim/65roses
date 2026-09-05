import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  rankMandatesForAsset,
  rankAssetsForMandate,
  type AssetProfile,
  type MandateProfile,
  type MatchResult,
} from "@/lib/engine/matching";
import { scoreUniverse, type ScoredInstitution } from "@/server/scoring";

/** Countries where a buyer already operates — derived, not hand-maintained. */
const PLATFORM_HINT: Record<string, string[]> = {};

export const loadMandateProfiles = cache(async (): Promise<MandateProfile[]> => {
  const mandates = await db.investorMandate.findMany({
    include: {
      criteria: true,
      organisation: {
        select: {
          id: true, name: true, type: true, countriesActive: true,
          institutions: { select: { country: true, type: true } },
        },
      },
    },
  });

  return mandates
    .filter((m) => m.criteria)
    .map((m) => {
      const org = m.organisation;
      // A buyer's platforms are wherever it already owns something, plus the
      // countries it states it is active in.
      const platforms = Array.from(
        new Set([...org.institutions.map((i) => i.country), ...org.countriesActive]),
      );
      const patterns = Array.from(new Set(org.institutions.map((i) => i.type)));
      return {
        id: m.id,
        organisationId: org.id,
        organisationName: org.name,
        organisationType: org.type,
        mandateName: m.name,
        isActive: m.isActive,
        countries: m.criteria!.countries,
        regions: m.criteria!.regions,
        segments: m.criteria!.segments,
        curricula: m.criteria!.curricula,
        minEv: m.criteria!.minEv,
        maxEv: m.criteria!.maxEv,
        minEbitda: m.criteria!.minEbitda,
        maxEbitda: m.criteria!.maxEbitda,
        minStudents: m.criteria!.minStudents,
        maxStudents: m.criteria!.maxStudents,
        control: m.criteria!.control,
        propertyPreference: m.criteria!.propertyPreference,
        requiresOwnedProperty: m.criteria!.requiresOwnedProperty,
        leaseAcceptable: m.criteria!.leaseAcceptable,
        platformStrategy: m.criteria!.platformStrategy,
        existingPlatforms: PLATFORM_HINT[org.name] ?? platforms,
        acquisitionPatterns: patterns,
        relationshipStrength: 3,
      } satisfies MandateProfile;
    });
});

/** Terra's relationship with each buying organisation, from the graph edges. */
export const loadOrgRelationshipStrength = cache(async (): Promise<Map<string, number>> => {
  const relationships = await db.relationship.findMany({
    where: { toOrganisationId: { not: null }, fromPerson: { isInternal: true } },
    select: { toOrganisationId: true, strength: true },
  });
  // Terra people also relate to individuals who work at these organisations —
  // that route counts too, and is usually the stronger one.
  const viaPeople = await db.relationship.findMany({
    where: {
      fromPerson: { isInternal: true },
      toPerson: { organisationId: { not: null } },
    },
    select: { strength: true, toPerson: { select: { organisationId: true } } },
  });

  const map = new Map<string, number>();
  for (const r of relationships) {
    if (!r.toOrganisationId) continue;
    map.set(r.toOrganisationId, Math.max(map.get(r.toOrganisationId) ?? 1, r.strength));
  }
  for (const r of viaPeople) {
    const orgId = r.toPerson?.organisationId;
    if (!orgId) continue;
    map.set(orgId, Math.max(map.get(orgId) ?? 1, r.strength));
  }
  return map;
});

export async function mandateProfilesWithRelationships(): Promise<MandateProfile[]> {
  const [profiles, strengths] = await Promise.all([
    loadMandateProfiles(),
    loadOrgRelationshipStrength(),
  ]);
  return profiles.map((p) => ({
    ...p,
    relationshipStrength: strengths.get(p.organisationId) ?? 1,
  }));
}

export function assetProfileFrom(inst: ScoredInstitution): AssetProfile {
  const owned = inst.tenure === "OWNED" || inst.tenure === "MIXED";
  return {
    id: inst.id,
    name: inst.name,
    country: inst.country,
    region: inst.region,
    city: inst.city,
    type: inst.type,
    curriculum: inst.curriculum,
    students: inst.students,
    enterpriseValue: inst.enterpriseValueHigh || null,
    ebitda: owned && inst.ebitda !== null ? inst.ebitda - inst.marketRent : inst.ebitda,
    tenure: inst.tenure as AssetProfile["tenure"],
    propertyValue: inst.propertyValueHigh,
    ownershipType: inst.ownershipType,
    relationshipStrength: inst.relationshipStrength,
  };
}

export interface NamedMatch extends MatchResult {
  organisationId: string;
  organisationName: string;
  organisationType: string;
  mandateName: string;
  isActive: boolean;
}

function name(result: MatchResult, mandate: MandateProfile): NamedMatch {
  return {
    ...result,
    organisationId: mandate.organisationId,
    organisationName: mandate.organisationName,
    organisationType: mandate.organisationType,
    mandateName: mandate.mandateName,
    isActive: mandate.isActive,
  };
}

/** Forward: which buyers fit this school. */
export async function matchesForInstitution(
  inst: ScoredInstitution,
  opts: { includeDisqualified?: boolean; limit?: number } = {},
): Promise<NamedMatch[]> {
  const mandates = await mandateProfilesWithRelationships();
  const byId = new Map(mandates.map((m) => [m.id, m]));
  const results = rankMandatesForAsset(assetProfileFrom(inst), mandates, opts);
  return results.map((r) => name(r, byId.get(r.mandateId)!));
}

export interface NamedTarget extends MatchResult {
  institution: ScoredInstitution;
}

/** Reverse: which schools fit this mandate. "Find Targets". */
export async function targetsForMandate(
  mandateId: string,
  opts: { includeDisqualified?: boolean; limit?: number } = {},
): Promise<NamedTarget[]> {
  const [mandates, universe] = await Promise.all([
    mandateProfilesWithRelationships(),
    scoreUniverse(),
  ]);
  const mandate = mandates.find((m) => m.id === mandateId);
  if (!mandate) return [];

  const byId = new Map(universe.map((i) => [i.id, i]));
  const results = rankAssetsForMandate(mandate, universe.map(assetProfileFrom), opts);
  return results
    .map((r) => {
      const institution = byId.get(r.institutionId);
      return institution ? { ...r, institution } : null;
    })
    .filter((r): r is NamedTarget => r !== null);
}

/** The two sides of a PropCo/OpCo split, ranked separately. */
export async function splitMatches(inst: ScoredInstitution) {
  const all = await matchesForInstitution(inst, { includeDisqualified: true });
  const propcoTypes = new Set(["REAL_ESTATE_INVESTOR", "REIT", "INFRASTRUCTURE_FUND", "PENSION_FUND"]);
  return {
    opco: all.filter((m) => !propcoTypes.has(m.organisationType) && !m.disqualified),
    propco: all.filter((m) => propcoTypes.has(m.organisationType) && !m.disqualified),
    excluded: all.filter((m) => m.disqualified),
  };
}
