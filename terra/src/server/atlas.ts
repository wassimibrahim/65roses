import "server-only";
import { db } from "@/lib/db";
import { scoreUniverse, type ScoredInstitution } from "@/server/scoring";

export interface AtlasFilters {
  q?: string;
  country?: string[];
  region?: string[];
  type?: string[];
  ownership?: string[];
  tenure?: string[];
  succession?: string[];
  access?: string[];
  minScore?: number;
  minStudents?: number;
  maxStudents?: number;
  minEv?: number;
  maxEv?: number;
  minMatches?: number;
  minPropertyValue?: number;
  uncontacted?: boolean;
  sort?: string;
  direction?: "asc" | "desc";
}

export const SORTABLE = {
  score: (i: ScoredInstitution) => i.displayScore,
  name: (i: ScoredInstitution) => i.name.toLowerCase(),
  students: (i: ScoredInstitution) => i.students ?? -1,
  utilisation: (i: ScoredInstitution) => i.utilisation ?? -1,
  revenue: (i: ScoredInstitution) => i.revenue ?? -1,
  ebitda: (i: ScoredInstitution) => i.ebitda ?? -1,
  ev: (i: ScoredInstitution) => i.enterpriseValueHigh,
  property: (i: ScoredInstitution) => i.propertyValueHigh ?? -1,
  matches: (i: ScoredInstitution) => i.strongMatchCount * 1000 + i.bestMatchScore,
  relationship: (i: ScoredInstitution) => i.relationshipStrength,
} as const;

export type SortKey = keyof typeof SORTABLE;

function includesAny(value: string | null, list?: string[]): boolean {
  if (!list || list.length === 0) return true;
  return value !== null && list.includes(value);
}

export async function filterInstitutions(filters: AtlasFilters): Promise<ScoredInstitution[]> {
  const universe = await scoreUniverse();
  const q = filters.q?.trim().toLowerCase();

  const filtered = universe.filter((i) => {
    if (q) {
      const haystack = [i.name, i.city, i.region, i.familyName, i.summary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (!includesAny(i.country, filters.country)) return false;
    if (!includesAny(i.region, filters.region)) return false;
    if (!includesAny(i.type, filters.type)) return false;
    if (!includesAny(i.ownershipType, filters.ownership)) return false;
    if (!includesAny(i.tenure, filters.tenure)) return false;
    if (!includesAny(i.successionStatus, filters.succession)) return false;
    if (!includesAny(i.accessTier, filters.access)) return false;
    if (filters.minScore != null && i.displayScore < filters.minScore) return false;
    if (filters.minStudents != null && (i.students ?? 0) < filters.minStudents) return false;
    if (filters.maxStudents != null && (i.students ?? Infinity) > filters.maxStudents) return false;
    if (filters.minEv != null && i.enterpriseValueHigh < filters.minEv) return false;
    if (filters.maxEv != null && i.enterpriseValueLow > filters.maxEv) return false;
    if (filters.minMatches != null && i.strongMatchCount < filters.minMatches) return false;
    if (filters.minPropertyValue != null && (i.propertyValueHigh ?? 0) < filters.minPropertyValue)
      return false;
    if (filters.uncontacted && (i.hasOpportunity || i.lastInteractionAt !== null)) return false;
    return true;
  });

  const key = (filters.sort ?? "score") as SortKey;
  const accessor = SORTABLE[key] ?? SORTABLE.score;
  const direction = filters.direction ?? (key === "name" ? "asc" : "desc");

  return filtered.sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av === bv) return a.name.localeCompare(b.name);
    if (typeof av === "string" || typeof bv === "string") {
      return direction === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    }
    return direction === "asc" ? av - bv : bv - av;
  });
}

export async function atlasFacets() {
  const universe = await scoreUniverse();
  const collect = (fn: (i: ScoredInstitution) => string | null) =>
    Array.from(new Set(universe.map(fn).filter((v): v is string => Boolean(v)))).sort();

  return {
    countries: collect((i) => i.country),
    regions: collect((i) => i.region),
    types: collect((i) => i.type),
    ownership: collect((i) => i.ownershipType),
    tenure: collect((i) => i.tenure),
    succession: collect((i) => i.successionStatus),
    access: ["DIRECT", "WARM_INTRODUCTION", "SECOND_DEGREE", "COLD"],
    total: universe.length,
  };
}

export async function savedViews(module = "atlas") {
  return db.savedView.findMany({ where: { module }, orderBy: { label: "asc" } });
}

/** Portfolio-level read of a filtered set, shown above the Atlas table. */
export function summarise(rows: ScoredInstitution[]) {
  const withEv = rows.filter((r) => r.enterpriseValueHigh > 0);
  const owned = rows.filter((r) => r.tenure === "OWNED" || r.tenure === "MIXED");
  return {
    count: rows.length,
    students: rows.reduce((a, r) => a + (r.students ?? 0), 0),
    evLow: withEv.reduce((a, r) => a + r.enterpriseValueLow, 0),
    evHigh: withEv.reduce((a, r) => a + r.enterpriseValueHigh, 0),
    propertyValue: owned.reduce((a, r) => a + (r.propertyValueHigh ?? 0), 0),
    ownedCount: owned.length,
    withStrongMatch: rows.filter((r) => r.strongMatchCount > 0).length,
    warmOrBetter: rows.filter((r) => r.accessTier === "DIRECT" || r.accessTier === "WARM_INTRODUCTION").length,
    averageScore: rows.length
      ? Math.round(rows.reduce((a, r) => a + r.displayScore, 0) / rows.length)
      : 0,
  };
}
