import { requireUser } from "@/lib/rbac";
import { allComparables } from "@/server/underwriting";
import { compSetStats } from "@/lib/engine/valuation";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/provenance";
import { money, multiple, monthYear } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const metadata = { title: "Precedent transactions" };
export const dynamic = "force-dynamic";

export default async function ComparablesPage() {
  await requireUser();
  const comps = await allComparables();

  const stats = compSetStats(
    comps.map((c) => ({
      target: c.target, buyer: c.buyer, country: c.country, date: c.date,
      segment: c.segment, evEbitda: c.evEbitda, evRevenue: c.evRevenue,
      realEstateIncluded: c.realEstateIncluded,
    })),
  );
  const withRe = comps.filter((c) => c.realEstateIncluded);
  const withoutRe = comps.filter((c) => !c.realEstateIncluded);
  const statsWith = compSetStats(withRe.map(toInput));
  const statsWithout = compSetStats(withoutRe.map(toInput));

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Underwriting", href: "/underwriting" },
          { label: "Precedent transactions" },
        ]}
        title="Precedent transactions"
        subtitle={`${comps.length} transactions · ${stats.evEbitda ? `${multiple(stats.evEbitda.low)}–${multiple(stats.evEbitda.high)} EV/EBITDA interquartile, median ${multiple(stats.evEbitda.median)}` : ""}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href="/api/export/comparables">Export CSV</a>
          </Button>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <section className="mb-6 grid gap-6 lg:grid-cols-3">
          <Band title="All transactions" stats={stats} count={comps.length} />
          <Band title="Real estate included" stats={statsWith} count={withRe.length} />
          <Band title="Operating company only" stats={statsWithout} count={withoutRe.length} />
        </section>

        <Panel>
          <PanelHeader title="Transactions" meta={`${comps.length}`} />
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Buyer</th>
                  <th>Country</th>
                  <th>Segment</th>
                  <th>Date</th>
                  <th className="text-right">EV</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">EBITDA</th>
                  <th className="text-right">EV / Rev</th>
                  <th className="text-right">EV / EBITDA</th>
                  <th>Real estate</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.id}>
                    <td className="text-[12.5px] text-ink">{c.target}</td>
                    <td className="text-[11.5px] text-graphite">{c.buyer}</td>
                    <td className="text-[11.5px] text-graphite">{c.country}</td>
                    <td className="text-[11.5px] text-graphite">{humanise(c.segment)}</td>
                    <td className="num text-[11px] text-stone">{monthYear(c.date)}</td>
                    <td className="num text-right text-[11.5px]">{money(c.ev)}</td>
                    <td className="num text-right text-[11.5px]">{money(c.revenue)}</td>
                    <td className="num text-right text-[11.5px]">{money(c.ebitda)}</td>
                    <td className="num text-right text-[11.5px]">{multiple(c.evRevenue)}</td>
                    <td className="num text-right text-[11.5px] text-ink">{multiple(c.evEbitda)}</td>
                    <td>
                      {c.realEstateIncluded ? (
                        <Badge tone="neutral" mono>Included</Badge>
                      ) : (
                        <Badge tone="quiet" mono>Excluded</Badge>
                      )}
                    </td>
                    <td className="max-w-[240px] text-[11px] text-stone">{c.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <footer className="mt-10 flex items-center justify-between border-t border-rule-soft pt-4">
          <DemoNotice />
          <span className="text-[10.5px] text-stone">
            Whether real estate was included changes the multiple materially. The two sets are
            never blended.
          </span>
        </footer>
      </div>
    </>
  );
}

function toInput(c: {
  target: string; buyer: string; country: string; date: Date; segment: string;
  evEbitda: number | null; evRevenue: number | null; realEstateIncluded: boolean;
}) {
  return c;
}

function Band({
  title,
  stats,
  count,
}: {
  title: string;
  stats: ReturnType<typeof compSetStats>;
  count: number;
}) {
  return (
    <Panel>
      <PanelHeader title={title} meta={`${count} transactions`} />
      <PanelBody className="space-y-2">
        {stats.evEbitda ? (
          <>
            <Row label="EV / EBITDA — lower quartile" value={multiple(stats.evEbitda.low)} />
            <Row label="Median" value={multiple(stats.evEbitda.median)} emphasis />
            <Row label="Upper quartile" value={multiple(stats.evEbitda.high)} />
          </>
        ) : (
          <p className="text-[12px] text-stone">Not enough data.</p>
        )}
        {stats.evRevenue ? (
          <div className="border-t border-rule-soft pt-2">
            <Row label="EV / Revenue — median" value={multiple(stats.evRevenue.median)} />
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-[11.5px] ${emphasis ? "text-ink" : "text-graphite"}`}>{label}</span>
      <span className={`num text-[12.5px] ${emphasis ? "text-ink" : "text-graphite"}`}>{value}</span>
    </div>
  );
}
