/**
 * MATCH ENGINE — asset ↔ capital, in both directions.
 *
 * Forward:  given an institution, rank active mandates.
 * Reverse:  given a mandate, rank institutions ("Find Targets").
 *
 * Both directions run the same scoring function, so a match is symmetric: the
 * number Terra quotes to a founder is the number it quotes to a buyer.
 */

import { bounded, fitWithin, round, type DimensionResult } from "./types";

export type InstitutionType = string;
export type ControlPreference = "CONTROL" | "MAJORITY" | "MINORITY" | "FLEXIBLE";
export type PropertyPreference =
  | "PROPERTY_LIGHT"
  | "PROPERTY_HEAVY"
  | "REQUIRES_OWNED"
  | "INDIFFERENT";
export type Tenure = "OWNED" | "LEASED" | "MIXED" | "UNKNOWN";

export interface AssetProfile {
  id: string;
  name: string;
  country: string;
  region: string | null;
  city: string | null;
  type: InstitutionType;
  curriculum: string[];
  students: number | null;
  enterpriseValue: number | null;
  ebitda: number | null;
  tenure: Tenure;
  propertyValue: number | null;
  /** Whether ownership is realistically willing to sell control. */
  ownershipType: string;
  /** 1..5 — Terra's best route to this asset's owners. */
  relationshipStrength: number;
}

export interface MandateProfile {
  id: string;
  organisationId: string;
  organisationName: string;
  organisationType: string;
  mandateName: string;
  isActive: boolean;
  countries: string[];
  regions: string[];
  segments: InstitutionType[];
  curricula: string[];
  minEv: number | null;
  maxEv: number | null;
  minEbitda: number | null;
  maxEbitda: number | null;
  minStudents: number | null;
  maxStudents: number | null;
  control: ControlPreference;
  propertyPreference: PropertyPreference;
  requiresOwnedProperty: boolean;
  leaseAcceptable: boolean;
  platformStrategy: string | null;
  /** Countries where the buyer already operates — the strategic-logic input. */
  existingPlatforms: string[];
  /** Historic acquisition segments — pattern matching. */
  acquisitionPatterns: InstitutionType[];
  /** 1..5 — Terra's relationship with the buyer. */
  relationshipStrength: number;
}

export interface MatchDimension extends DimensionResult {}

export interface MatchResult {
  mandateId: string;
  institutionId: string;
  score: number;
  dimensions: MatchDimension[];
  reasons: string[];
  issues: string[];
  /** Hard mismatch — surfaced but never ranked as a real option. */
  disqualified: boolean;
}

const WEIGHTS = {
  geography: 0.16,
  size: 0.15,
  segment: 0.13,
  curriculum: 0.08,
  strategic: 0.14,
  realEstate: 0.11,
  ownership: 0.08,
  mandateFit: 0.07,
  pattern: 0.04,
  relationship: 0.04,
} as const;

function dim(
  key: string,
  label: string,
  raw: number,
  drivers: string[],
  detractors: string[],
): MatchDimension {
  return { key, label, weight: 0, raw: bounded(raw), weighted: 0, drivers, detractors };
}

/**
 * A property mandate is buying the campus, not the school. It is priced on
 * rent and yield, so its size test runs against the property value and the
 * EBITDA band does not apply at all.
 */
export function isPropertyMandate(mandate: MandateProfile): boolean {
  return (
    mandate.requiresOwnedProperty ||
    mandate.propertyPreference === "REQUIRES_OWNED" ||
    ["REAL_ESTATE_INVESTOR", "REIT", "INFRASTRUCTURE_FUND", "PENSION_FUND"].includes(
      mandate.organisationType,
    )
  );
}

export function matchScore(asset: AssetProfile, mandate: MandateProfile): MatchResult {
  const reasons: string[] = [];
  const issues: string[] = [];
  let disqualified = false;
  const propertyMandate = isPropertyMandate(mandate);

  // ── Geography ──────────────────────────────────────────────────────────────
  const geoDrivers: string[] = [];
  const geoDetractors: string[] = [];
  let geo = 0;
  const countryMatch = mandate.countries.length === 0 || mandate.countries.includes(asset.country);
  if (countryMatch) {
    geo = 78;
    if (mandate.countries.includes(asset.country)) geoDrivers.push(`Mandate targets ${asset.country}`);
  } else {
    geo = 6;
    geoDetractors.push(`${asset.country} is outside the stated mandate geography`);
    disqualified = true;
  }
  if (asset.region && mandate.regions.includes(asset.region)) {
    geo = 100;
    geoDrivers.push(`${asset.region} named in the mandate`);
  }
  if (mandate.existingPlatforms.includes(asset.country)) {
    geo = Math.min(100, geo + 12);
    geoDrivers.push(`Existing ${asset.country} platform`);
  }

  // ── Size ───────────────────────────────────────────────────────────────────
  const sizeDrivers: string[] = [];
  const sizeDetractors: string[] = [];
  const parts: number[] = [];
  // What the buyer is actually acquiring decides which number is tested.
  const sizeBasis = propertyMandate ? asset.propertyValue : asset.enterpriseValue;
  if (sizeBasis != null && (mandate.minEv != null || mandate.maxEv != null)) {
    const s = fitWithin(sizeBasis, mandate.minEv, mandate.maxEv);
    parts.push(s);
    const label = propertyMandate ? "Property value" : "Enterprise value";
    if (s >= 95) sizeDrivers.push(`${label} sits inside the mandate band`);
    else if (s < 45) sizeDetractors.push(`${label} outside the mandate band`);
  } else if (propertyMandate && asset.propertyValue == null && (mandate.minEv != null || mandate.maxEv != null)) {
    parts.push(0);
    sizeDetractors.push("No freehold to value against the mandate band");
  }
  if (!propertyMandate && asset.ebitda != null && (mandate.minEbitda != null || mandate.maxEbitda != null)) {
    const s = fitWithin(asset.ebitda, mandate.minEbitda, mandate.maxEbitda);
    parts.push(s);
    if (s >= 95) sizeDrivers.push("EBITDA inside the mandate band");
    else if (s < 45) sizeDetractors.push("EBITDA outside the mandate band");
  }
  if (!propertyMandate && asset.students != null && (mandate.minStudents != null || mandate.maxStudents != null)) {
    const s = fitWithin(asset.students, mandate.minStudents, mandate.maxStudents);
    parts.push(s);
    if (s >= 95) sizeDrivers.push(`${asset.students} students matches target scale`);
    else if (s < 45) sizeDetractors.push("Student scale outside target");
  }
  const size = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 65;
  if (parts.length && size < 25) disqualified = true;

  // ── Segment ────────────────────────────────────────────────────────────────
  const segDrivers: string[] = [];
  const segDetractors: string[] = [];
  let segment: number;
  if (mandate.segments.length === 0) {
    segment = 65;
  } else if (mandate.segments.includes(asset.type)) {
    segment = 100;
    segDrivers.push(`${asset.type.replace(/_/g, " ").toLowerCase()} is a named target segment`);
  } else if (adjacentSegment(asset.type, mandate.segments)) {
    segment = 58;
    segDetractors.push("Adjacent rather than core segment");
  } else {
    segment = 10;
    segDetractors.push("Segment outside the mandate");
    disqualified = true;
  }

  // ── Curriculum ─────────────────────────────────────────────────────────────
  const curDrivers: string[] = [];
  const curDetractors: string[] = [];
  let curriculum: number;
  if (mandate.curricula.length === 0) {
    curriculum = 65;
  } else {
    const overlap = asset.curriculum.filter((c) =>
      mandate.curricula.some((m) => m.toLowerCase() === c.toLowerCase()),
    );
    curriculum = overlap.length ? bounded(70 + overlap.length * 15) : 28;
    if (overlap.length) curDrivers.push(`${overlap.join(" / ")} curriculum fit`);
    else curDetractors.push("Curriculum does not match stated preference");
  }

  // ── Strategic logic ────────────────────────────────────────────────────────
  const stratDrivers: string[] = [];
  const stratDetractors: string[] = [];
  let strategic = 50;
  if (mandate.existingPlatforms.includes(asset.country)) {
    strategic += 25;
    stratDrivers.push("Add-on to an existing national platform");
  }
  if (mandate.platformStrategy === "PLATFORM" && !mandate.existingPlatforms.includes(asset.country)) {
    strategic += 20;
    stratDrivers.push("Credible platform entry point into a new market");
  }
  if (mandate.organisationType === "EDUCATION_OPERATOR") {
    strategic += 12;
    stratDrivers.push("Operator with direct integration capability");
  }
  if (mandate.organisationType === "REAL_ESTATE_INVESTOR" || mandate.organisationType === "REIT") {
    strategic += asset.tenure === "OWNED" ? 18 : -25;
    if (asset.tenure !== "OWNED")
      stratDetractors.push("Property investor with no freehold to acquire");
  }
  strategic = bounded(strategic);

  // ── Real estate ────────────────────────────────────────────────────────────
  const reDrivers: string[] = [];
  const reDetractors: string[] = [];
  let realEstate = 55;
  const owned = asset.tenure === "OWNED" || asset.tenure === "MIXED";
  switch (mandate.propertyPreference) {
    case "REQUIRES_OWNED":
      realEstate = owned ? 100 : 5;
      if (owned) reDrivers.push("Freehold requirement satisfied");
      else {
        reDetractors.push("Mandate requires owned property");
        disqualified = true;
      }
      break;
    case "PROPERTY_HEAVY":
      realEstate = owned ? 92 : 30;
      if (owned) reDrivers.push("Property-heavy appetite matches owned estate");
      break;
    case "PROPERTY_LIGHT":
      realEstate = owned ? 58 : 92;
      if (owned)
        reDetractors.push("Property-light buyer — freehold likely carved out to a PropCo");
      else reDrivers.push("Property-light structure as preferred");
      break;
    default:
      realEstate = 70;
  }
  if (mandate.requiresOwnedProperty && !owned) {
    realEstate = 5;
    disqualified = true;
  }
  if (!mandate.leaseAcceptable && asset.tenure === "LEASED") {
    realEstate = 10;
    reDetractors.push("Buyer will not take leasehold exposure");
  }

  // ── Ownership preference ───────────────────────────────────────────────────
  const ownDrivers: string[] = [];
  const ownDetractors: string[] = [];
  let ownership = 60;
  const willingSeller = ["FOUNDER", "FAMILY", "PE_BACKED"].includes(asset.ownershipType);
  if (mandate.control === "CONTROL" || mandate.control === "MAJORITY") {
    ownership = willingSeller ? 88 : 42;
    if (willingSeller) ownDrivers.push("Ownership structure can deliver control");
    else ownDetractors.push("Control may be difficult to obtain from this owner type");
  } else if (mandate.control === "MINORITY") {
    ownership = willingSeller ? 78 : 60;
    ownDrivers.push("Minority appetite suits a founder retaining involvement");
  } else {
    ownership = 74;
  }
  if (asset.ownershipType === "GOVERNMENT") {
    ownership = 2;
    disqualified = true;
    ownDetractors.push("Publicly owned — not transactable");
  }

  // ── Mandate status ─────────────────────────────────────────────────────────
  const mandateFit = mandate.isActive ? 100 : 35;
  const mandateDrivers = mandate.isActive ? ["Mandate is live"] : [];
  const mandateDetractors = mandate.isActive ? [] : ["Mandate not currently active"];

  // ── Acquisition pattern ────────────────────────────────────────────────────
  const patternHit = mandate.acquisitionPatterns.includes(asset.type);
  const pattern = patternHit ? 100 : mandate.acquisitionPatterns.length ? 45 : 60;
  const patternDrivers = patternHit ? ["Consistent with prior acquisition pattern"] : [];

  // ── Terra relationship ─────────────────────────────────────────────────────
  const relationship = bounded(((mandate.relationshipStrength - 1) / 4) * 100);
  const relDrivers =
    mandate.relationshipStrength >= 4 ? [`Terra relationship with ${mandate.organisationName} is established`] : [];
  const relDetractors = mandate.relationshipStrength <= 2 ? ["Limited relationship with this buyer"] : [];

  const dimensions: MatchDimension[] = [
    dim("geography", "Geography fit", geo, geoDrivers, geoDetractors),
    dim("size", "Size fit", size, sizeDrivers, sizeDetractors),
    dim("segment", "Segment fit", segment, segDrivers, segDetractors),
    dim("curriculum", "Curriculum fit", curriculum, curDrivers, curDetractors),
    dim("strategic", "Strategic logic", strategic, stratDrivers, stratDetractors),
    dim("realEstate", "Real-estate fit", realEstate, reDrivers, reDetractors),
    dim("ownership", "Ownership preference", ownership, ownDrivers, ownDetractors),
    dim("mandateFit", "Known mandate fit", mandateFit, mandateDrivers, mandateDetractors),
    dim("pattern", "Acquisition pattern", pattern, patternDrivers, []),
    dim("relationship", "Terra relationship", relationship, relDrivers, relDetractors),
  ];

  let total = 0;
  for (const d of dimensions) {
    const w = WEIGHTS[d.key as keyof typeof WEIGHTS] ?? 0;
    d.weight = w;
    d.weighted = round(d.raw * w, 2);
    d.raw = round(d.raw, 1);
    total += d.weighted;
    reasons.push(...d.drivers);
    issues.push(...d.detractors);
  }

  // A disqualifying mismatch is capped, not hidden: Terra still shows why.
  const score = disqualified ? Math.min(34, Math.round(total)) : Math.round(bounded(total));

  return {
    mandateId: mandate.id,
    institutionId: asset.id,
    score,
    dimensions,
    reasons: reasons.slice(0, 8),
    issues: issues.slice(0, 6),
    disqualified,
  };
}

const ADJACENCY: Record<string, string[]> = {
  K12: ["INTERNATIONAL_SCHOOL", "BILINGUAL_SCHOOL", "BRITISH_SCHOOL", "AMERICAN_SCHOOL", "IB_SCHOOL", "EARLY_YEARS"],
  INTERNATIONAL_SCHOOL: ["K12", "BRITISH_SCHOOL", "AMERICAN_SCHOOL", "IB_SCHOOL", "BILINGUAL_SCHOOL"],
  BRITISH_SCHOOL: ["INTERNATIONAL_SCHOOL", "K12", "IB_SCHOOL"],
  AMERICAN_SCHOOL: ["INTERNATIONAL_SCHOOL", "K12", "IB_SCHOOL"],
  IB_SCHOOL: ["INTERNATIONAL_SCHOOL", "K12", "BILINGUAL_SCHOOL"],
  BILINGUAL_SCHOOL: ["K12", "INTERNATIONAL_SCHOOL", "IB_SCHOOL"],
  EARLY_YEARS: ["K12", "BILINGUAL_SCHOOL"],
  VOCATIONAL: ["HIGHER_EDUCATION", "TRAINING", "BUSINESS_SCHOOL"],
  HIGHER_EDUCATION: ["UNIVERSITY", "BUSINESS_SCHOOL", "VOCATIONAL"],
  UNIVERSITY: ["HIGHER_EDUCATION", "BUSINESS_SCHOOL"],
  BUSINESS_SCHOOL: ["HIGHER_EDUCATION", "UNIVERSITY"],
  LANGUAGE_SCHOOL: ["TRAINING", "VOCATIONAL"],
  TRAINING: ["VOCATIONAL", "LANGUAGE_SCHOOL", "EDTECH"],
  EDTECH: ["TRAINING"],
  SPECIAL_EDUCATION: ["K12"],
};

function adjacentSegment(type: string, segments: string[]): boolean {
  const near = ADJACENCY[type] ?? [];
  return segments.some((s) => near.includes(s));
}

/** Forward match: rank every mandate against one asset. */
export function rankMandatesForAsset(
  asset: AssetProfile,
  mandates: MandateProfile[],
  opts: { includeDisqualified?: boolean; limit?: number } = {},
): MatchResult[] {
  const results = mandates
    .map((m) => matchScore(asset, m))
    .filter((r) => opts.includeDisqualified || !r.disqualified)
    .sort((a, b) => b.score - a.score);
  return opts.limit ? results.slice(0, opts.limit) : results;
}

/** Reverse match: rank every asset against one mandate. */
export function rankAssetsForMandate(
  mandate: MandateProfile,
  assets: AssetProfile[],
  opts: { includeDisqualified?: boolean; limit?: number } = {},
): MatchResult[] {
  const results = assets
    .map((a) => matchScore(a, mandate))
    .filter((r) => opts.includeDisqualified || !r.disqualified)
    .sort((a, b) => b.score - a.score);
  return opts.limit ? results.slice(0, opts.limit) : results;
}
