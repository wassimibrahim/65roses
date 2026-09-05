import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { analyseOpportunity } from "@/server/thesis";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreMark, ScoreBar } from "@/components/ui/score";
import { AccessChip } from "@/components/data/access-chip";
import { PathTrail } from "@/components/data/path-trail";
import { AssertionTag, DecisionSupportNote, DemoNotice } from "@/components/ui/provenance";
import { moneyRange, money, percent, multiple } from "@/lib/format";
import { STRUCTURE_LABELS } from "@/lib/engine/structures";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  return { title: analysis ? `Opportunity · ${analysis.profile.record.name}` : "Opportunity" };
}

const CONFIDENCE_TONE = {
  HIGH: "forest",
  MODERATE: "neutral",
  EXPLORATORY: "quiet",
} as const;

export default async function OpportunityPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  if (!analysis) notFound();

  const { profile, thesis, structures, legacyFit, assumptions } = analysis;
  const { record, scored } = profile;
  const recommended = structures.find((s) => s.type === thesis.recommendedStructure)!;
  const recommendedFit = legacyFit.find((f) => f.type === thesis.recommendedStructure);

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Atlas", href: "/atlas" },
          { label: record.name, href: `/atlas/${slug}` },
          { label: "Opportunity" },
        ]}
        title="Transaction thesis"
        subtitle={`${record.name} · generated from ownership, property, financials, signals, mandates and relationships`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/atlas/${slug}/memo`}><FileText /> Memo</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/atlas/${slug}/structures`}>Structure lab</Link>
            </Button>
          </>
        }
      />

      <div className="px-6 py-6 md:px-8">
        {/* ── The thesis ─────────────────────────────────────────────────── */}
        <section className="border border-rule bg-paper px-6 py-7 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="eyebrow">Recommended thesis</span>
                <Badge tone={CONFIDENCE_TONE[thesis.confidence]} mono>
                  {thesis.confidence.toLowerCase()} conviction
                </Badge>
                <AssertionTag assertion="TERRA_HYPOTHESIS" />
              </div>
              <h2 className="display text-[27px] leading-snug text-ink">{thesis.headline}</h2>
            </div>
            <ScoreMark score={scored.displayScore} size="xl" label="Opportunity" overridden={scored.overridden} />
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-3">
            <div>
              <div className="eyebrow mb-2">Why</div>
              <ul className="space-y-1.5">
                {thesis.rationale.map((line, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-graphite">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="eyebrow mb-2">Estimated structure</div>
              <dl className="space-y-1.5">
                {analysis.opcoValuation ? (
                  <Row label="OpCo enterprise value" value={moneyRange(analysis.opcoValuation.low, analysis.opcoValuation.high)} />
                ) : null}
                {analysis.propcoValuation ? (
                  <Row label="PropCo" value={moneyRange(analysis.propcoValuation.low, analysis.propcoValuation.high)} />
                ) : null}
                <Row label="Founder proceeds at close" value={money(recommended.founderProceeds)} />
                <Row label="Stake retained" value={percent(recommended.stakeRetained)} />
                {recommended.rentImplication > 0 ? (
                  <Row label="Rent created" value={`${money(recommended.rentImplication)} p.a.`} />
                ) : null}
                {recommended.secondExitProceeds > 0 ? (
                  <Row label="Illustrative second exit" value={money(recommended.secondExitProceeds)} />
                ) : null}
              </dl>
            </div>

            <div>
              <div className="eyebrow mb-2">Where this is weak</div>
              {thesis.risks.length === 0 ? (
                <p className="text-[12.5px] text-stone">Nothing material identified.</p>
              ) : (
                <ul className="space-y-1.5">
                  {thesis.risks.map((risk, i) => (
                    <li key={i} className="text-[12.5px] leading-relaxed text-graphite">
                      <span className="mr-1.5 text-burgundy">−</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ── Counterparties, access, next action ────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Panel>
            <PanelHeader title="Likely counterparties" meta="Operating business" />
            {thesis.counterparties.opco.length === 0 ? (
              <PanelBody>
                <p className="text-[12px] text-stone">No mandate currently fits the operating business.</p>
              </PanelBody>
            ) : (
              <ul>
                {thesis.counterparties.opco.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center gap-3 border-b border-rule-soft px-4 py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{c.name}</span>
                    <ScoreBar value={c.score} className="w-16" tone={c.score >= 80 ? "forest" : "ink"} />
                    <span className="num w-6 shrink-0 text-right text-[12px] text-graphite">{c.score}</span>
                  </li>
                ))}
              </ul>
            )}
            {thesis.counterparties.propco.length > 0 ? (
              <>
                <PanelHeader title="Campus" className="border-t" />
                <ul>
                  {thesis.counterparties.propco.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center gap-3 border-b border-rule-soft px-4 py-2.5 last:border-b-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{c.name}</span>
                      <ScoreBar value={c.score} className="w-16" tone={c.score >= 80 ? "forest" : "ink"} />
                      <span className="num w-6 shrink-0 text-right text-[12px] text-graphite">{c.score}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title="Terra access" />
            <PanelBody className="space-y-3">
              <AccessChip tier={thesis.access.tier} />
              {profile.access.best ? (
                <PathTrail path={profile.access.best} />
              ) : (
                <p className="text-[12px] leading-relaxed text-stone">
                  No route identified today.
                </p>
              )}
            </PanelBody>
          </Panel>

          <Panel className="border-ink">
            <PanelHeader title="Next best action" />
            <PanelBody className="space-y-3">
              <p className="display flex items-start gap-2 text-[16px] leading-snug text-ink">
                {thesis.nextBestAction}
              </p>
              <Button size="sm" asChild>
                <Link href={`/origination?institution=${record.slug}`}>
                  Open in origination <ArrowRight />
                </Link>
              </Button>
            </PanelBody>
          </Panel>
        </div>

        {/* ── Structures ─────────────────────────────────────────────────── */}
        <Panel className="mt-6">
          <PanelHeader
            title="Structures compared"
            meta={`Median comparable multiple ${assumptions.compMedian ? multiple(assumptions.compMedian) : "—"} across ${assumptions.compCount} transactions`}
            action={
              <Link href={`/atlas/${slug}/structures`} className="text-[11px] text-stone hover:text-ink">
                Edit assumptions →
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th className="text-right">Founder liquidity</th>
                  <th className="text-right">Control retained</th>
                  <th className="text-right">Financial outcome</th>
                  <th className="text-right">Legacy preservation</th>
                  <th className="text-right">Investor appeal</th>
                  <th className="text-right">Complexity</th>
                  <th className="text-right">Estimated value</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => {
                  const fit = legacyFit.find((f) => f.type === s.type)!;
                  const isRecommended = s.type === thesis.recommendedStructure;
                  const appeal =
                    s.type === "FULL_SALE" || s.type === "MAJORITY_PARTNERSHIP" || s.type === "OPCO_SALE"
                      ? "High"
                      : s.type === "MINORITY_GROWTH" || s.type === "SALE_LEASEBACK" || s.type === "PROPCO_SALE"
                        ? "Moderate"
                        : "Selective";
                  return (
                    <tr key={s.type} className={isRecommended ? "bg-paper" : undefined}>
                      <td>
                        <span className="text-[12.5px] text-ink">{STRUCTURE_LABELS[s.type]}</span>
                        {isRecommended ? (
                          <Badge tone="ink" mono className="ml-2">Recommended</Badge>
                        ) : null}
                        <div className="mt-0.5 max-w-md text-[10.5px] leading-snug text-stone">
                          {s.description}
                        </div>
                      </td>
                      <td className="num text-right text-[11.5px]">{money(s.founderProceeds)}</td>
                      <td className="text-right text-[11.5px] text-graphite">
                        {s.stakeRetained > 0 ? percent(s.stakeRetained) : s.controlRetained ? "Full" : "None"}
                      </td>
                      <td className="text-right">
                        <span className="num text-[11.5px] text-graphite">{fit.financialOutcome}</span>
                        <ScoreBar value={fit.financialOutcome} className="mt-1 w-16" />
                      </td>
                      <td className="text-right">
                        <span className="num text-[11.5px] text-graphite">{fit.legacyPreservation}</span>
                        <ScoreBar
                          value={fit.legacyPreservation}
                          className="mt-1 w-16"
                          tone={fit.legacyPreservation >= 75 ? "forest" : "ink"}
                        />
                      </td>
                      <td className="text-right text-[11.5px] text-graphite">{appeal}</td>
                      <td className="num text-right text-[11.5px] text-graphite">{s.complexity}/5</td>
                      <td className="num text-right text-[11.5px]">{money(s.enterpriseValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PanelBody className="border-t border-rule-soft py-3">
            <p className="text-[11px] leading-relaxed text-stone">
              Financial outcome is relative to the best structure on this table, including an
              illustrative second exit on any retained stake. Legacy preservation is weighted by
              {record.founderProfile ? " the founder's own ranking of objectives." : " a generic objective set, because no founder objectives have been captured for this institution."}
            </p>
            <DecisionSupportNote className="mt-2" />
          </PanelBody>
        </Panel>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11.5px] text-stone">{label}</dt>
      <dd className="num text-[12.5px] text-ink">{value}</dd>
    </div>
  );
}
