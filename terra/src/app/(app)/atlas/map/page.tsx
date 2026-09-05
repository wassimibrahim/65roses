import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { filterInstitutions, atlasFacets, savedViews, summarise, type AtlasFilters } from "@/server/atlas";
import { PageHeader } from "@/components/shell/page-header";
import { FilterBar } from "@/components/atlas/filter-bar";
import { MapView } from "@/components/atlas/map-view";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/provenance";
import { moneyRange, exact } from "@/lib/format";

export const metadata = { title: "Origination map" };
export const dynamic = "force-dynamic";

function list(value: string | undefined) {
  const parts = value?.split(",").filter(Boolean);
  return parts && parts.length ? parts : undefined;
}
function num(value: string | undefined) {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function AtlasMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;

  const filters: AtlasFilters = {
    q: sp.q,
    country: list(sp.country),
    region: list(sp.region),
    type: list(sp.type),
    ownership: list(sp.ownership),
    tenure: list(sp.tenure),
    succession: list(sp.succession),
    access: list(sp.access),
    minScore: num(sp.minScore),
    minMatches: num(sp.minMatches),
    minPropertyValue: num(sp.minPropertyValue),
    uncontacted: sp.uncontacted === "1",
  };

  const [rows, facets, views] = await Promise.all([
    filterInstitutions(filters),
    atlasFacets(),
    savedViews("atlas"),
  ]);
  const totals = summarise(rows);

  const pins = rows
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      country: r.country,
      lat: r.latitude!,
      lng: r.longitude!,
      score: r.displayScore,
      students: r.students,
      utilisation: r.utilisation,
      evLow: r.enterpriseValueLow,
      evHigh: r.enterpriseValueHigh,
      propertyValue: r.propertyValueHigh,
      ownership: r.ownershipType,
      tenure: r.tenure,
      type: r.type,
      accessTier: r.accessTier,
      strongMatches: r.strongMatchCount,
      hasOpportunity: r.hasOpportunity,
    }));

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Atlas", href: "/atlas" },
          { label: "Map" },
        ]}
        title="Origination map"
        subtitle={
          <>
            {pins.length} located institutions · {exact(totals.students)} students ·{" "}
            {moneyRange(totals.evLow, totals.evHigh)}
          </>
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/atlas">Table</Link>
          </Button>
        }
      />

      <div className="px-6 py-5 md:px-8">
        <div className="mb-5">
          <FilterBar
            savedViews={views.map((v) => ({
              key: v.key,
              label: v.label,
              query: v.query as Record<string, unknown>,
            }))}
            facets={[
              { key: "country", label: "Country", options: facets.countries },
              { key: "region", label: "Region", options: facets.regions },
              { key: "type", label: "Segment", options: facets.types },
              { key: "ownership", label: "Ownership", options: facets.ownership },
              { key: "tenure", label: "Property", options: facets.tenure },
              { key: "succession", label: "Succession", options: facets.succession },
              { key: "access", label: "Access", options: facets.access },
            ]}
          />
        </div>

        <MapView pins={pins} hasToken={Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)} />

        <footer className="mt-10 flex items-center justify-between border-t border-rule-soft pt-4">
          <DemoNotice />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-light">
            Confidential — Terra Capital
          </span>
        </footer>
      </div>
    </>
  );
}
