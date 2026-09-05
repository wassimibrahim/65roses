import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { filterInstitutions, atlasFacets, savedViews, summarise, type AtlasFilters } from "@/server/atlas";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, EmptyState } from "@/components/ui/panel";
import { FilterBar } from "@/components/atlas/filter-bar";
import { SortHeader } from "@/components/atlas/sort-header";
import { AccessChip } from "@/components/data/access-chip";
import { ScoreMark } from "@/components/ui/score";
import { DemoNotice } from "@/components/ui/provenance";
import { Badge } from "@/components/ui/badge";
import { money, moneyRange, exact, percent } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Atlas" };
export const dynamic = "force-dynamic";

function list(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").filter(Boolean);
  return parts.length ? parts : undefined;
}

function num(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function AtlasPage({
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
    minStudents: num(sp.minStudents),
    maxStudents: num(sp.maxStudents),
    minEv: num(sp.minEv),
    maxEv: num(sp.maxEv),
    minMatches: num(sp.minMatches),
    minPropertyValue: num(sp.minPropertyValue),
    uncontacted: sp.uncontacted === "1",
    sort: sp.sort,
    direction: sp.direction === "asc" ? "asc" : sp.direction === "desc" ? "desc" : undefined,
  };

  const [rows, facets, views] = await Promise.all([
    filterInstitutions(filters),
    atlasFacets(),
    savedViews("atlas"),
  ]);
  const totals = summarise(rows);

  const exportHref = `/api/export/institutions?${new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  ).toString()}`;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Atlas" }]}
        title="Atlas"
        subtitle={
          <>
            {totals.count} of {facets.total} institutions · {exact(totals.students)} students ·{" "}
            {moneyRange(totals.evLow, totals.evHigh)} potential enterprise value
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href={exportHref}>Export CSV</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/atlas/map">Map</Link>
            </Button>
          </>
        }
      />

      <div className="px-6 py-5 md:px-8">
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

        <section className="mt-5 grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Institutions" value={String(totals.count)} />
          <Stat label="Students" value={exact(totals.students)} />
          <Stat label="Potential EV" value={moneyRange(totals.evLow, totals.evHigh)} />
          <Stat label="Owned property" value={`${money(totals.propertyValue)} · ${totals.ownedCount}`} />
          <Stat label="With strong match" value={String(totals.withStrongMatch)} />
          <Stat label="Warm or better" value={String(totals.warmOrBetter)} />
        </section>

        <Panel className="mt-5">
          {rows.length === 0 ? (
            <EmptyState
              title="No institution matches these filters."
              hint="Widen the geography or lower the score threshold."
            />
          ) : (
            <div className="max-h-[calc(100vh-330px)] overflow-auto">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th className="w-[46px] text-right"><SortHeader sortKey="score" label="Score" align="right" /></th>
                    <th><SortHeader sortKey="name" label="Institution" defaultDirection="asc" /></th>
                    <th>Location</th>
                    <th>Segment</th>
                    <th>Ownership</th>
                    <th className="text-right"><SortHeader sortKey="students" label="Students" align="right" /></th>
                    <th className="text-right"><SortHeader sortKey="utilisation" label="Util." align="right" /></th>
                    <th className="text-right"><SortHeader sortKey="revenue" label="Revenue" align="right" /></th>
                    <th className="text-right"><SortHeader sortKey="ebitda" label="EBITDA" align="right" /></th>
                    <th className="text-right"><SortHeader sortKey="ev" label="Est. EV" align="right" /></th>
                    <th>Property</th>
                    <th className="text-right"><SortHeader sortKey="matches" label="Matches" align="right" /></th>
                    <th><SortHeader sortKey="relationship" label="Access" /></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="text-right">
                        <ScoreMark score={row.displayScore} size="sm" overridden={row.overridden} className="items-end" />
                      </td>
                      <td className="max-w-[230px]">
                        <Link href={`/atlas/${row.slug}`} className="text-[12.5px] text-ink hover:underline">
                          {row.name}
                        </Link>
                        {row.hasOpportunity ? (
                          <span className="ml-1.5 align-middle text-[9px] text-forest" title="In origination">
                            ●
                          </span>
                        ) : null}
                        {row.familyName ? (
                          <div className="text-[10.5px] text-stone">{row.familyName} family</div>
                        ) : null}
                      </td>
                      <td className="text-[11.5px] text-graphite">
                        {row.city}
                        <div className="text-[10px] text-stone">{row.country}</div>
                      </td>
                      <td className="text-[11.5px] text-graphite">{humanise(row.type)}</td>
                      <td className="text-[11.5px] text-graphite">
                        {humanise(row.ownershipType)}
                        {row.successionStatus === "POTENTIAL_SUCCESSION_ISSUE" ||
                        row.successionStatus === "TRANSITION_UNDERWAY" ? (
                          <div className="text-[10px] text-amber">{humanise(row.successionStatus)}</div>
                        ) : null}
                      </td>
                      <td className="num text-right text-[11.5px]">{exact(row.students)}</td>
                      <td className="num text-right text-[11.5px]">{percent(row.utilisation)}</td>
                      <td className="num text-right text-[11.5px]">{money(row.revenue)}</td>
                      <td className="num text-right text-[11.5px]">{money(row.ebitda)}</td>
                      <td className="num text-right text-[11.5px]">
                        {moneyRange(row.enterpriseValueLow, row.enterpriseValueHigh)}
                      </td>
                      <td>
                        {row.tenure === "OWNED" || row.tenure === "MIXED" ? (
                          <span className="text-[11.5px] text-graphite">
                            {humanise(row.tenure)}
                            <span className="num ml-1.5 text-[10.5px] text-stone">
                              {money(row.propertyValueHigh)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-stone">{humanise(row.tenure)}</span>
                        )}
                      </td>
                      <td className="text-right">
                        {row.strongMatchCount > 0 ? (
                          <Badge tone="forest" mono>
                            {row.strongMatchCount} · {row.bestMatchScore}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-stone-light">—</span>
                        )}
                      </td>
                      <td><AccessChip tier={row.accessTier} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <footer className="mt-6 flex items-center justify-between border-t border-rule-soft pt-4">
          <DemoNotice />
          <span className="text-[10.5px] text-stone">
            Financial figures are Terra estimates unless labelled otherwise.
          </span>
        </footer>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ivory px-3.5 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className="num mt-0.5 text-[14px] text-ink">{value}</div>
    </div>
  );
}
