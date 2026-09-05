import Link from "next/link";
import { ArrowUpRight, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import {
  priorityOpportunities,
  dealPulse,
  followUps,
  pipelineMetrics,
  recentSignals,
} from "@/server/command";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ScoreMark } from "@/components/ui/score";
import { AssertionTag, DemoNotice } from "@/components/ui/provenance";
import { money, moneyRange, percent, exact, relativeDays, date as fmtDate } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { StageChip } from "@/components/data/stage-chip";
import { AccessChip } from "@/components/data/access-chip";

export const metadata = { title: "Command" };
export const dynamic = "force-dynamic";

export default async function CommandPage() {
  const user = await requireUser();
  const [priorities, deals, follows, metrics, signals] = await Promise.all([
    priorityOpportunities(6),
    dealPulse(),
    followUps(7),
    pipelineMetrics(),
    recentSignals(7),
  ]);

  const requiringAttention = priorities.filter((p) => p.institution.displayScore >= 75).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}.`}
        subtitle={
          requiringAttention > 0 ? (
            <span>
              <span className="text-ink">
                {requiringAttention} {requiringAttention === 1 ? "opportunity requires" : "opportunities require"} attention.
              </span>{" "}
              {deals.length} live mandates.
            </span>
          ) : (
            <span>{deals.length} live mandates. Nothing above threshold in origination today.</span>
          )
        }
        actions={
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-stone-light sm:block">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </span>
        }
      />

      <div className="px-6 py-6 md:px-8">
        {/* ── Metrics ─────────────────────────────────────────────────────── */}
        <section className="mb-8 grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-4 lg:grid-cols-8">
          <Metric label="Potential EV" value={money(metrics.potentialEv)} />
          <Metric label="Active mandates" value={String(metrics.activeMandates)} />
          <Metric label="Weighted fees" value={money(metrics.weightedFeePipeline)} />
          <Metric label="Qualified proprietary" value={String(metrics.qualifiedProprietary)} />
          <Metric label="Investor mandates" value={String(metrics.activeInvestorMandates)} />
          <Metric label="Founder conversations" value={String(metrics.founderConversationsThisQuarter)} hint="This quarter" />
          <Metric label="Closed" value={String(metrics.transactionsClosed)} />
          <Metric label="Repeat clients" value={percent(metrics.repeatClientPct)} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          {/* ── Priority opportunities ───────────────────────────────────── */}
          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Priority opportunities"
                meta="Ranked by Terra Opportunity Score"
                action={
                  <Link href="/origination" className="text-[11px] text-stone hover:text-ink">
                    All origination →
                  </Link>
                }
              />
              <ol>
                {priorities.map((p, index) => (
                  <li
                    key={p.institution.id}
                    className="border-b border-rule-soft px-4 py-4 last:border-b-0"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-1 w-4 shrink-0 font-mono text-[10px] text-stone-light">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          <Link
                            href={`/atlas/${p.institution.slug}`}
                            className="display text-[16.5px] text-ink hover:underline"
                          >
                            {p.institution.name}
                          </Link>
                          {p.stage ? <StageChip stage={p.stage} /> : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-stone">
                          {[p.institution.city, humanise(p.institution.type), `${humanise(p.institution.ownershipType)}-owned`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="eyebrow">Why now</span>
                            <AssertionTag assertion="TERRA_HYPOTHESIS" />
                          </div>
                          {p.whyNow.map((line, i) => (
                            <p key={i} className="max-w-2xl text-[12px] leading-relaxed text-graphite">
                              {line}
                            </p>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
                          <span className="text-stone">
                            Potential EV{" "}
                            <span className="num text-ink">
                              {moneyRange(p.institution.enterpriseValueLow, p.institution.enterpriseValueHigh)}
                            </span>
                          </span>
                          <AccessChip tier={p.institution.accessTier} />
                          {p.topMatches.length > 0 ? (
                            <span className="text-stone">
                              OpCo buyers{" "}
                              <span className="text-graphite">
                                {p.topMatches.map((m) => `${m.name} ${m.score}`).join(" · ")}
                              </span>
                            </span>
                          ) : null}
                          {p.propcoMatches.length > 0 ? (
                            <span className="text-stone">
                              PropCo{" "}
                              <span className="text-graphite">
                                {p.propcoMatches.map((m) => `${m.name} ${m.score}`).join(" · ")}
                              </span>
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink">
                          <span className="eyebrow">Action</span>
                          {p.recommendedAction}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <ScoreMark
                          score={p.institution.displayScore}
                          size="lg"
                          overridden={p.institution.overridden}
                        />
                        <Link
                          href={`/atlas/${p.institution.slug}/opportunity`}
                          className="mt-1 inline-flex items-center gap-0.5 text-[10.5px] text-stone hover:text-ink"
                        >
                          Find opportunity <ArrowUpRight className="size-2.5" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            {/* ── Deal pulse ─────────────────────────────────────────────── */}
            <Panel>
              <PanelHeader
                title="Active deal pulse"
                meta={`${deals.length} live`}
                action={
                  <Link href="/deals" className="text-[11px] text-stone hover:text-ink">
                    All deals →
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Stage</th>
                      <th className="text-right">EV</th>
                      <th className="text-right">Prob.</th>
                      <th>Next milestone</th>
                      <th className="text-right">Last touch</th>
                      <th>Partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <Link href={`/deals/${d.slug}`} className="text-[12.5px] text-ink hover:underline">
                            {d.codeName}
                          </Link>
                          <div className="text-[10.5px] text-stone">{d.client}</div>
                          {d.blocker ? (
                            <div className="mt-1 flex items-start gap-1 text-[10.5px] text-burgundy">
                              <AlertTriangle className="mt-px size-2.5 shrink-0" />
                              {d.blocker}
                            </div>
                          ) : null}
                        </td>
                        <td><StageChip stage={d.stage} /></td>
                        <td className="num text-right">{money(d.expectedEv)}</td>
                        <td className="num text-right">{percent(d.probability)}</td>
                        <td>
                          <span className="text-[11.5px] text-graphite">{d.nextMilestone ?? "—"}</span>
                          {d.nextMilestoneDue ? (
                            <div className="num text-[10px] text-stone">{fmtDate(d.nextMilestoneDue)}</div>
                          ) : null}
                        </td>
                        <td className="num text-right text-[11.5px]">
                          <span className={d.daysSinceInteraction && d.daysSinceInteraction > 21 ? "text-burgundy" : "text-graphite"}>
                            {d.daysSinceInteraction === null ? "—" : `${d.daysSinceInteraction}d`}
                          </span>
                        </td>
                        <td className="text-[11.5px] text-graphite">{d.partner ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Relationship follow-ups" />
              {follows.length === 0 ? (
                <EmptyState title="Nothing outstanding." hint="Every commitment has been closed out." />
              ) : (
                <ul>
                  {follows.map((f) => (
                    <li key={f.id} className="border-b border-rule-soft last:border-b-0">
                      <Link href={f.href} className="block px-4 py-3 transition-colors hover:bg-paper">
                        <div className="flex items-start gap-2">
                          <Badge tone={f.kind === "COLD" ? "burgundy" : f.kind === "MANDATE" ? "forest" : "neutral"} mono>
                            {f.kind === "COLD" ? "Quiet" : f.kind === "COMMITMENT" ? "Promised" : f.kind === "MANDATE" ? "Mandate" : "Signal"}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink">{f.text}</p>
                        {f.detail ? <p className="mt-0.5 text-[10.5px] text-stone">{f.detail}</p> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Market signals"
                action={
                  <Link href="/intelligence" className="text-[11px] text-stone hover:text-ink">
                    Intelligence →
                  </Link>
                }
              />
              <ul>
                {signals.map((s) => (
                  <li key={s.id} className="border-b border-rule-soft px-4 py-3 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="eyebrow">{humanise(s.type)}</span>
                      <span className="num text-[10px] text-stone-light">{relativeDays(s.date)}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink">{s.headline}</p>
                    {s.institution ? (
                      <Link
                        href={`/atlas/${s.institution.slug}`}
                        className="mt-0.5 block text-[10.5px] text-stone hover:text-ink"
                      >
                        {s.institution.name}
                      </Link>
                    ) : null}
                    {s.interpretation ? (
                      <p className="mt-1.5 flex flex-wrap items-baseline gap-1.5 text-[11px] leading-relaxed text-graphite">
                        <AssertionTag assertion="TERRA_HYPOTHESIS" />
                        {s.interpretation}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
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

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-ivory px-3.5 py-3">
      <div className="eyebrow">{label}</div>
      <div className="num mt-1 text-[17px] leading-none text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[9.5px] text-stone-light">{hint}</div> : null}
    </div>
  );
}
