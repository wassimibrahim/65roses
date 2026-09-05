/**
 * Question understanding for Terra Intelligence.
 *
 * Pure and deterministic: given a question, decide what is being asked and
 * which filters apply. Keeping this separate from the data access makes the
 * behaviour testable, which matters — a query layer that silently
 * misinterprets a question is worse than one that says it cannot answer.
 */

export type QueryIntent =
  | "INTRODUCTION_PATH"
  | "MANDATES_FOR_ASSET"
  | "TARGETS_FOR_MANDATE"
  | "COLD_RELATIONSHIPS"
  | "UNCONTACTED_OPPORTUNITIES"
  | "PRECEDENT_TRANSACTIONS"
  | "RECENT_CHANGES"
  | "INSTITUTION_SEARCH";

export interface InstitutionFilters {
  city?: string;
  country?: string;
  ownership?: ("FOUNDER" | "FAMILY")[];
  ownedProperty?: boolean;
  succession?: boolean;
  segments?: string[];
  minStudents?: number;
  maxStudents?: number;
}

export interface QueryPlan {
  intent: QueryIntent;
  filters: InstitutionFilters;
  /** Human-readable criteria, shown so the answer can be checked. */
  criteria: string[];
  /** Year mentioned in the question, for transaction queries. */
  sinceYear?: number;
}

const CITIES = [
  "madrid", "barcelona", "valencia", "seville", "bilbao", "malaga", "marbella",
  "lisbon", "porto", "milan", "rome", "lyon", "paris", "zurich", "dubai",
  "zaragoza", "alicante", "girona", "granada", "vigo", "toledo", "santander",
  "pamplona", "oviedo", "cadiz", "faro", "coimbra", "turin", "reading", "las rozas",
  "alcobendas", "aranjuez", "valladolid", "murcia",
];

const COUNTRIES = [
  "spain", "portugal", "italy", "france", "switzerland", "united kingdom",
  "united arab emirates", "germany",
];

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Strips accents so "Málaga" and "malaga" match the same city. */
export function normalise(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function parseThreshold(raw: string): number | null {
  const cleaned = raw.replace(/[,.](?=\d{3}\b)/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function planQuery(question: string): QueryPlan {
  const lower = normalise(question);
  const criteria: string[] = [];

  // ── Intent ────────────────────────────────────────────────────────────────
  if (/(introduc|who can|get us into|route to|access to|warm route)/.test(lower)) {
    return { intent: "INTRODUCTION_PATH", filters: {}, criteria: ["Maximum four hops", "Strongest path first"] };
  }
  if (/(gone cold|gone quiet|not spoken|neglect|stale relationship|lapsed|which relationships)/.test(lower)) {
    return {
      intent: "COLD_RELATIONSHIPS",
      filters: {},
      criteria: ["Relationship strength 4 or 5", "No interaction in 45 days", "Oldest first"],
    };
  }
  if (/(not contacted|uncontacted|never approached|not approached|have not contacted)/.test(lower)) {
    return {
      intent: "UNCONTACTED_OPPORTUNITIES",
      filters: {},
      criteria: ["No opportunity record", "No interaction logged", "Ranked by Terra score"],
    };
  }
  if (/(what changed|changed this|changed in|last month|this month|new signals|recent activity)/.test(lower)) {
    const city = CITIES.find((c) => lower.includes(c));
    return {
      intent: "RECENT_CHANGES",
      filters: city ? { city: titleCase(city) } : {},
      criteria: ["Last 45 days", city ? `City: ${titleCase(city)}` : "All locations"],
    };
  }
  if (/(transaction|acquisition|comparable|precedent)/.test(lower)) {
    const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
    const country = COUNTRIES.find((c) => lower.includes(c));
    return {
      intent: "PRECEDENT_TRANSACTIONS",
      filters: country ? { country: titleCase(country) } : {},
      sinceYear: yearMatch ? Number(yearMatch[0]) : undefined,
      criteria: [
        yearMatch ? `Date from ${yearMatch[0]}` : "All dates",
        country ? `Country: ${titleCase(country)}` : "All countries",
      ],
    };
  }
  if (/(find targets|targets for|which (schools|institutions|assets).*(fit|match|suit))/.test(lower)) {
    return { intent: "TARGETS_FOR_MANDATE", filters: {}, criteria: ["Disqualified assets excluded"] };
  }
  if (/(mandate|buyer|investor).*(fit|match|suit)|which .*(mandates|buyers)/.test(lower)) {
    return {
      intent: "MANDATES_FOR_ASSET",
      filters: {},
      criteria: ["Mandate status: active", "Disqualified mandates excluded"],
    };
  }

  // ── Institution search ────────────────────────────────────────────────────
  const filters: InstitutionFilters = {};

  const city = CITIES.find((c) => lower.includes(c));
  if (city) {
    filters.city = titleCase(city);
    criteria.push(`City: ${titleCase(city)}`);
  }

  const country = COUNTRIES.find((c) => lower.includes(c));
  if (country && !city) {
    filters.country = titleCase(country);
    criteria.push(`Country: ${titleCase(country)}`);
  }

  if (/founder[- ]owned|founder[- ]led/.test(lower)) {
    filters.ownership = ["FOUNDER"];
    criteria.push("Ownership: founder");
  } else if (/family[- ]owned|family business|families/.test(lower)) {
    filters.ownership = ["FOUNDER", "FAMILY"];
    criteria.push("Ownership: founder or family");
  }

  if (/owned (real estate|property|campus)|freehold|owns (its|their) (campus|property)|own their|property owned/.test(lower)) {
    filters.ownedProperty = true;
    criteria.push("Campus: owned or mixed tenure");
  }

  if (/succession/.test(lower)) {
    filters.succession = true;
    criteria.push("Succession: unresolved, underway or founder-led");
  }

  const segments: string[] = [];
  if (/\bk-?12\b/.test(lower)) segments.push("K12");
  if (/bilingual/.test(lower)) segments.push("BILINGUAL_SCHOOL");
  if (/international school/.test(lower)) segments.push("INTERNATIONAL_SCHOOL");
  if (/british school/.test(lower)) segments.push("BRITISH_SCHOOL");
  if (/vocational/.test(lower)) segments.push("VOCATIONAL");
  if (/early years|nursery|nurseries/.test(lower)) segments.push("EARLY_YEARS");
  if (/business school/.test(lower)) segments.push("BUSINESS_SCHOOL");
  if (segments.length) {
    filters.segments = segments;
    criteria.push(`Segment: ${segments.map((s) => s.replace(/_/g, " ").toLowerCase()).join(", ")}`);
  }

  const above = lower.match(/(?:more than|over|above|greater than|at least|>)\s*([\d,.]+)\s*(?:students|pupils)/);
  if (above) {
    const value = parseThreshold(above[1]!);
    if (value !== null) {
      filters.minStudents = value;
      criteria.push(`Students above ${value}`);
    }
  }

  const below = lower.match(/(?:fewer than|under|below|less than|<)\s*([\d,.]+)\s*(?:students|pupils)/);
  if (below) {
    const value = parseThreshold(below[1]!);
    if (value !== null) {
      filters.maxStudents = value;
      criteria.push(`Students below ${value}`);
    }
  }

  return { intent: "INSTITUTION_SEARCH", filters, criteria };
}

/** True when the plan carries no usable filter — the caller should fall back. */
export function planIsEmpty(plan: QueryPlan): boolean {
  return plan.intent === "INSTITUTION_SEARCH" && plan.criteria.length === 0;
}
