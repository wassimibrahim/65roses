import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { filterInstitutions, type AtlasFilters } from "@/server/atlas";
import { toCsv, csvResponse } from "@/lib/csv";
import { humanise } from "@/lib/utils";

function list(v: string | null) {
  return v ? v.split(",").filter(Boolean) : undefined;
}
function num(v: string | null) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const sp = request.nextUrl.searchParams;

  const filters: AtlasFilters = {
    q: sp.get("q") ?? undefined,
    country: list(sp.get("country")),
    region: list(sp.get("region")),
    type: list(sp.get("type")),
    ownership: list(sp.get("ownership")),
    tenure: list(sp.get("tenure")),
    succession: list(sp.get("succession")),
    access: list(sp.get("access")),
    minScore: num(sp.get("minScore")),
    minMatches: num(sp.get("minMatches")),
    minPropertyValue: num(sp.get("minPropertyValue")),
    uncontacted: sp.get("uncontacted") === "1",
  };

  const rows = await filterInstitutions(filters);

  // Exporting PII-adjacent market intelligence is an audited event.
  await recordAudit({
    userId: user.id,
    action: "EXPORT",
    entityType: "EducationInstitution",
    entityId: "atlas-query",
    context: `${rows.length} rows · ${sp.toString() || "no filters"}`,
  });

  const csv = toCsv(
    rows.map((r) => ({
      Institution: r.name,
      City: r.city,
      Region: r.region,
      Country: r.country,
      Segment: humanise(r.type),
      Ownership: humanise(r.ownershipType),
      Family: r.familyName,
      Succession: humanise(r.successionStatus),
      Students: r.students,
      Capacity: r.capacity,
      "Utilisation %": r.utilisation ? Math.round(r.utilisation * 100) : null,
      "Revenue (EUR, Terra estimate)": r.revenue,
      "EBITDA (EUR, Terra estimate)": r.ebitda,
      "EBITDA margin %": r.ebitdaMargin ? Math.round(r.ebitdaMargin * 100) : null,
      Tenure: humanise(r.tenure),
      "Property value (EUR, Terra estimate)": r.propertyValueHigh,
      "Est. EV low": r.enterpriseValueLow,
      "Est. EV high": r.enterpriseValueHigh,
      "Terra Opportunity Score": r.displayScore,
      "Score overridden": r.overridden ? "Yes" : "No",
      "Active matches": r.matchCount,
      "Strong matches": r.strongMatchCount,
      "Best match score": r.bestMatchScore,
      Access: humanise(r.accessTier),
      "In origination": r.hasOpportunity ? "Yes" : "No",
      Basis: "Illustrative demo data — Terra estimates unless stated",
    })),
  );

  return csvResponse(csv, `terra-atlas-${new Date().toISOString().slice(0, 10)}.csv`);
}
