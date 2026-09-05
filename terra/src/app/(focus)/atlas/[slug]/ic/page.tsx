import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { analyseOpportunity } from "@/server/thesis";
import { money, moneyRange, percent, exact } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { STRUCTURE_LABELS } from "@/lib/engine/structures";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  return { title: analysis ? `IC · ${analysis.profile.record.name}` : "Investment committee" };
}

/**
 * Investment committee view. Deliberately without navigation: one opportunity,
 * on a boardroom monitor, with nothing else on the screen.
 */
export default async function InvestmentCommitteePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  if (!analysis) notFound();

  const { profile, thesis, structures, legacyFit, opcoValuation, propcoValuation } = analysis;
  const { record, scored, matches, access } = profile;
  const recommended = structures.find((s) => s.type === thesis.recommendedStructure)!;
  const topStructures = [...legacyFit].sort((a, b) => b.objectiveFit - a.objectiveFit).slice(0, 3);

  return (
    <div className="min-h-screen bg-ivory px-8 py-8 lg:px-16 lg:py-12">
      <Link
        href={`/atlas/${slug}`}
        className="no-print fixed right-6 top-6 z-10 text-stone transition-colors hover:text-ink"
        aria-label="Close investment committee view"
      >
        <X className="size-4" />
      </Link>

      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-6">
        <div>
          <p className="eyebrow mb-2">Investment committee</p>
          <h1 className="display text-[42px] leading-none text-ink">{record.name}</h1>
          <p className="mt-2.5 text-[13px] text-graphite">
            {[record.city, record.country].filter(Boolean).join(", ")} · {humanise(record.type)} ·{" "}
            {humanise(record.ownershipType)}-owned
          </p>
        </div>
        <div className="flex items-end gap-10">
          <Figure label="Opportunity" value={String(scored.displayScore)} large />
          <Figure
            label="Estimated EV"
            value={moneyRange(scored.enterpriseValueLow, scored.enterpriseValueHigh)}
          />
          <Figure label="Access" value={thesis.access.label} />
          <Figure label="Conviction" value={thesis.confidence.toLowerCase()} />
        </div>
      </header>

      <section className="mb-10">
        <p className="eyebrow mb-3">Thesis</p>
        <p className="display max-w-5xl text-[28px] leading-snug text-ink">{thesis.headline}</p>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        <div>
          <p className="eyebrow mb-3">Key metrics</p>
          <dl className="space-y-2.5">
            <Row label="Students" value={`${exact(record.students)} / ${exact(record.capacity)}`} />
            <Row label="Utilisation" value={percent(record.utilisation)} />
            <Row label="Revenue" value={money(scored.revenue)} />
            <Row label="EBITDA" value={money(scored.ebitda)} />
            <Row label="EBITDA margin" value={percent(scored.ebitdaMargin)} />
            {scored.marketRent > 0 ? (
              <Row label="EBITDA after rent" value={money((scored.ebitda ?? 0) - scored.marketRent)} />
            ) : null}
            <Row label="Net debt" value={money(scored.netDebt)} />
          </dl>
        </div>

        <div>
          <p className="eyebrow mb-3">Valuation</p>
          <dl className="space-y-2.5">
            <Row
              label="Operating company"
              value={opcoValuation ? moneyRange(opcoValuation.low, opcoValuation.high) : "—"}
            />
            <Row
              label="Campus"
              value={propcoValuation ? moneyRange(propcoValuation.low, propcoValuation.high) : "Leased"}
            />
            <Row
              label="Combined"
              value={moneyRange(scored.enterpriseValueLow, scored.enterpriseValueHigh)}
              emphasis
            />
          </dl>

          <p className="eyebrow mb-3 mt-7">Structure</p>
          <p className="text-[15px] text-ink">{recommended.label}</p>
          <dl className="mt-2.5 space-y-2.5">
            <Row label="Founder proceeds" value={money(recommended.founderProceeds)} />
            <Row label="Stake retained" value={percent(recommended.stakeRetained)} />
            {recommended.rentImplication > 0 ? (
              <Row label="Rent created" value={money(recommended.rentImplication)} />
            ) : null}
            <Row label="Second exit" value={money(recommended.secondExitProceeds)} />
          </dl>
        </div>

        <div>
          <p className="eyebrow mb-3">Counterparties</p>
          <ul className="space-y-2">
            {matches.opco.slice(0, 4).map((m) => (
              <li key={m.mandateId} className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] text-ink">{m.organisationName}</span>
                <span className="num text-[13px] text-graphite">{m.score}</span>
              </li>
            ))}
          </ul>
          {matches.propco.length > 0 ? (
            <>
              <p className="eyebrow mb-2 mt-5">Campus buyers</p>
              <ul className="space-y-2">
                {matches.propco.slice(0, 3).map((m) => (
                  <li key={m.mandateId} className="flex items-baseline justify-between gap-4">
                    <span className="text-[13px] text-ink">{m.organisationName}</span>
                    <span className="num text-[13px] text-graphite">{m.score}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="eyebrow mb-2 mt-7">Relationship</p>
          <p className="text-[13px] leading-relaxed text-ink">
            {access.best?.narrative ?? "No route identified."}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 border-t border-rule-soft pt-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="eyebrow mb-3">Structures ranked against the founder&apos;s objectives</p>
          <table className="grid-table">
            <thead>
              <tr>
                <th>Structure</th>
                <th className="text-right">Financial</th>
                <th className="text-right">Legacy</th>
                <th className="text-right">Objective fit</th>
                <th className="text-right">Founder liquidity</th>
              </tr>
            </thead>
            <tbody>
              {topStructures.map((f) => {
                const outcome = structures.find((s) => s.type === f.type)!;
                return (
                  <tr key={f.type}>
                    <td className="text-[13px] text-ink">{STRUCTURE_LABELS[f.type]}</td>
                    <td className="num text-right text-[12.5px]">{f.financialOutcome}</td>
                    <td className="num text-right text-[12.5px]">{f.legacyPreservation}</td>
                    <td className="num text-right text-[13px] text-ink">{f.objectiveFit}</td>
                    <td className="num text-right text-[12.5px]">{money(outcome.founderProceeds)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <p className="eyebrow mb-3">Risks</p>
          <ul className="space-y-2">
            {[...record.riskFlags.slice(0, 3).map((r) => `${humanise(r.type)} — ${r.rationale}`), ...thesis.risks].map(
              (risk, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-graphite">
                  — {risk}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <footer className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t-2 border-ink pt-6">
        <div>
          <p className="eyebrow mb-2">Next action</p>
          <p className="display text-[21px] leading-snug text-ink">{thesis.nextBestAction}</p>
        </div>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone">
          Illustrative demo data · Decision support · Confidential — Terra Capital
        </p>
      </footer>
    </div>
  );
}

function Figure({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className={`num leading-none text-ink ${large ? "text-[38px]" : "text-[19px]"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft pb-2">
      <dt className={`text-[12.5px] ${emphasis ? "text-ink" : "text-stone"}`}>{label}</dt>
      <dd className={`num text-[14px] ${emphasis ? "text-ink" : "text-graphite"}`}>{value}</dd>
    </div>
  );
}
