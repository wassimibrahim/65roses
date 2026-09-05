import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import {
  loadOpportunities,
  uncoveredTargets,
  originationSummary,
  bySource,
  ORIGINATION_STAGES,
} from "@/server/origination";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreMark, ScoreBar } from "@/components/ui/score";
import { StageChip } from "@/components/data/stage-chip";
import { AccessChip } from "@/components/data/access-chip";
import { AssertionTag, DemoNotice } from "@/components/ui/provenance";
import { money, moneyRange, percent, date as fmtDate, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { OriginationBoard } from "@/components/origination/board";

export const metadata = { title: "Origination" };
export const dynamic = "force-dynamic";

export default async function OriginationPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireUser();
  const { view = "board" } = await searchParams;

  const [rows, uncovered] = await Promise.all([loadOpportunities(), uncoveredTargets(65, 10)]);
  const totals = originationSummary(rows);
  const sources = bySource(rows);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Origination" }]}
        title="Origination"
        subtitle={
          <>
            {totals.activeCount} live opportunities · {moneyRange(totals.evLow, totals.evHigh)}{" "}
            potential enterprise value · {money(totals.weightedEv)} probability-weighted
          </>
        }
        actions={
          <>
            <Button variant={view === "board" ? "default" : "outline"} size="sm" asChild>
              <Link href="/origination">Board</Link>
            </Button>
            <Button variant={view === "table" ? "default" : "outline"} size="sm" asChild>
              <Link href="/origination?view=table">Table</Link>
            </Button>
          </>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <section className="mb-6 grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Opportunities" value={String(totals.count)} />
          <Stat label="Potential EV" value={moneyRange(totals.evLow, totals.evHigh)} />
          <Stat label="Weighted EV" value={money(totals.weightedEv)} />
          <Stat label="Proprietary research" value={String(totals.proprietary)} />
          <Stat
            label="Actions overdue"
            value={String(totals.overdue)}
            tone={totals.overdue > 0 ? "burgundy" : undefined}
          />
          <Stat
            label="Missing why now"
            value={String(totals.withoutWhyNow)}
            tone={totals.withoutWhyNow > 0 ? "burgundy" : undefined}
          />
        </section>

        {view === "table" ? (
          <Panel>
            <PanelHeader title="All opportunities" meta={`${rows.length}`} />
            <div className="overflow-x-auto">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th className="text-right">Score</th>
                    <th>Opportunity</th>
                    <th>Stage</th>
                    <th>Type</th>
                    <th className="text-right">Est. EV</th>
                    <th className="text-right">P(mandate)</th>
                    <th>Owner</th>
                    <th>Source</th>
                    <th className="text-right">Last contact</th>
                    <th>Next action</th>
                    <th className="text-right">Matches</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const overdue =
                      row.nextActionDate && row.nextActionDate.getTime() < Date.now();
                    return (
                      <tr key={row.id}>
                        <td className="text-right">
                          <ScoreMark
                            score={row.institution.displayScore}
                            size="sm"
                            overridden={row.institution.overridden}
                            className="items-end"
                          />
                        </td>
                        <td className="max-w-[220px]">
                          <Link
                            href={`/atlas/${row.institution.slug}`}
                            className="text-[12.5px] text-ink hover:underline"
                          >
                            {row.name}
                          </Link>
                          <div className="text-[10.5px] text-stone">
                            {row.institution.city} · {humanise(row.institution.type)}
                          </div>
                        </td>
                        <td><StageChip stage={row.stage} /></td>
                        <td className="text-[11.5px] text-graphite">
                          {row.transactionType ? humanise(row.transactionType) : "—"}
                        </td>
                        <td className="num text-right text-[11.5px]">
                          {moneyRange(row.estimatedEvLow, row.estimatedEvHigh)}
                        </td>
                        <td className="num text-right text-[11.5px]">{percent(row.probability)}</td>
                        <td className="text-[11.5px] text-graphite">{row.ownerName ?? "—"}</td>
                        <td className="text-[11px] text-stone">{humanise(row.source)}</td>
                        <td className="num text-right text-[11px] text-stone">
                          {relativeDays(row.lastContactAt)}
                        </td>
                        <td className="max-w-[220px]">
                          <span className="text-[11.5px] text-graphite">{row.nextAction ?? "—"}</span>
                          {row.nextActionDate ? (
                            <div
                              className={`num text-[10px] ${overdue ? "text-burgundy" : "text-stone"}`}
                            >
                              {fmtDate(row.nextActionDate)}
                            </div>
                          ) : null}
                        </td>
                        <td className="num text-right text-[11.5px]">{row.matchCount}</td>
                        <td><AccessChip tier={row.institution.accessTier} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <OriginationBoard
            stages={[...ORIGINATION_STAGES]}
            rows={rows.map((r) => ({
              id: r.id,
              stage: r.stage,
              name: r.name,
              slug: r.institution.slug,
              city: r.institution.city,
              type: r.institution.type,
              score: r.institution.displayScore,
              overridden: r.institution.overridden,
              evLow: r.estimatedEvLow,
              evHigh: r.estimatedEvHigh,
              probability: r.probability,
              whyNow: r.whyNow,
              nextAction: r.nextAction,
              nextActionDate: r.nextActionDate ? r.nextActionDate.toISOString() : null,
              owner: r.ownerName,
              accessTier: r.institution.accessTier,
              matches: r.topMatches,
              transactionType: r.transactionType,
            }))}
          />
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader
              title="Uncontacted, high score"
              meta="Terra research has surfaced these; no opportunity has been opened"
            />
            {uncovered.length === 0 ? (
              <EmptyState title="Every high-scoring institution is already covered." />
            ) : (
              <table className="grid-table">
                <thead>
                  <tr>
                    <th className="text-right">Score</th>
                    <th>Institution</th>
                    <th>Location</th>
                    <th>Ownership</th>
                    <th className="text-right">Est. EV</th>
                    <th className="text-right">Matches</th>
                    <th>Access</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {uncovered.map((i) => (
                    <tr key={i.id}>
                      <td className="text-right">
                        <ScoreMark score={i.displayScore} size="sm" className="items-end" />
                      </td>
                      <td>
                        <Link href={`/atlas/${i.slug}`} className="text-[12.5px] text-ink hover:underline">
                          {i.name}
                        </Link>
                      </td>
                      <td className="text-[11.5px] text-graphite">{i.city}</td>
                      <td className="text-[11.5px] text-graphite">{humanise(i.ownershipType)}</td>
                      <td className="num text-right text-[11.5px]">
                        {moneyRange(i.enterpriseValueLow, i.enterpriseValueHigh)}
                      </td>
                      <td className="num text-right text-[11.5px]">{i.strongMatchCount}</td>
                      <td><AccessChip tier={i.accessTier} /></td>
                      <td className="text-right">
                        <Link
                          href={`/atlas/${i.slug}/opportunity`}
                          className="text-[11px] text-stone hover:text-ink"
                        >
                          Assess →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Origination by source" meta="Where deals come from" />
            <PanelBody className="space-y-3">
              {sources.map((s) => (
                <div key={s.source}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-ink">{humanise(s.source)}</span>
                    <span className="num text-[11px] text-stone">
                      {s.count} · {money(s.ev)}
                    </span>
                  </div>
                  <ScoreBar
                    value={s.count}
                    max={Math.max(...sources.map((x) => x.count))}
                    className="mt-1"
                  />
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>

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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "burgundy";
}) {
  return (
    <div className="bg-ivory px-3.5 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`num mt-0.5 text-[14px] ${tone === "burgundy" ? "text-burgundy" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
