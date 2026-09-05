import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { analyseOpportunity } from "@/server/thesis";
import { loadEvidence } from "@/server/institution";
import { PrintButton } from "@/components/ui/print-button";
import { money, moneyRange, percent, exact, ratio, date, ageLabel } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { STRUCTURE_LABELS } from "@/lib/engine/structures";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  return { title: analysis ? `Memo · ${analysis.profile.record.name}` : "Memo" };
}

/**
 * One-page institutional profile. Designed for print first — an A4 page with
 * margins, a rule under every section, and nothing that depends on colour.
 */
export default async function MemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const analysis = await analyseOpportunity(slug);
  if (!analysis) notFound();

  const { profile, thesis, structures, legacyFit } = analysis;
  const { record, scored, matches, access } = profile;
  const evidence = await loadEvidence(scored.id);
  const property = record.properties[0];
  const owned = record.tenure === "OWNED" || record.tenure === "MIXED";
  const recommended = structures.find((s) => s.type === thesis.recommendedStructure)!;

  const sources = Array.from(
    new Map(
      evidence
        .filter((e) => e.source)
        .map((e) => [e.source!.name, { name: e.source!.name, reviewed: e.lastReviewed }]),
    ).values(),
  );

  return (
    <div className="mx-auto max-w-[820px] px-6 py-8 md:px-8">
      <div className="no-print mb-6 flex items-center justify-between gap-4 border-b border-rule-soft pb-4">
        <Link href={`/atlas/${slug}`} className="text-[11.5px] text-stone hover:text-ink">
          ← Back to profile
        </Link>
        <PrintButton label="Print memo" />
      </div>

      <article className="space-y-6">
        {/* ── Masthead ─────────────────────────────────────────────────────── */}
        <header className="print-block border-b-2 border-ink pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow mb-2">Opportunity memorandum</p>
              <h1 className="display text-[30px] leading-tight text-ink">{record.name}</h1>
              <p className="mt-1 text-[12.5px] text-graphite">
                {[record.city, record.country].filter(Boolean).join(", ")} ·{" "}
                {humanise(record.type)}
                {record.curriculum.length ? ` · ${record.curriculum.join(" / ")}` : ""} ·{" "}
                {humanise(record.ownershipType)}-owned
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="eyebrow">Terra opportunity score</p>
              <p className="num text-[34px] leading-none text-ink">{scored.displayScore}</p>
              <p className="mt-1 text-[10px] text-stone">Prepared {date(new Date())}</p>
            </div>
          </div>
        </header>

        {/* ── Thesis ───────────────────────────────────────────────────────── */}
        <Section title="Thesis">
          <p className="display text-[17px] leading-snug text-ink">{thesis.headline}</p>
          <ul className="mt-3 space-y-1">
            {thesis.rationale.map((line, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-graphite">
                — {line}
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Snapshot ─────────────────────────────────────────────────────── */}
        <Section title="Institution">
          <Grid
            items={[
              { label: "Founded", value: record.foundedYear ? String(record.foundedYear) : "—" },
              { label: "Students", value: exact(record.students) },
              { label: "Capacity", value: exact(record.capacity) },
              { label: "Utilisation", value: percent(record.utilisation) },
              { label: "Tuition", value: `${money(record.tuitionLow)} – ${money(record.tuitionHigh)}` },
              { label: "Student / teacher", value: ratio(record.studentTeacherRatio) },
              { label: "Campuses", value: String(record.campusCount) },
              { label: "Accreditations", value: record.accreditations.join(", ") || "—" },
            ]}
          />
          {record.summary ? (
            <p className="mt-3 text-[12px] leading-relaxed text-graphite">{record.summary}</p>
          ) : null}
        </Section>

        <Section title="Ownership">
          <Grid
            items={[
              { label: "Ownership type", value: humanise(record.ownershipType) },
              { label: "Family", value: record.familyName ? `${record.familyName} family` : "—" },
              { label: "Generation", value: humanise(record.generation) },
              { label: "Founder age", value: record.founderAge ? String(record.founderAge) : "Not known" },
              { label: "Succession", value: humanise(record.successionStatus) },
              {
                label: "Current holders",
                value:
                  record.ownershipStakes
                    .filter((s) => s.to === null)
                    .map((s) => `${s.holderName} ${percent(s.percentage)}`)
                    .join(", ") || "—",
              },
            ]}
          />
        </Section>

        <Section title="Financial snapshot">
          <Grid
            items={[
              { label: "Revenue", value: money(scored.revenue) },
              { label: "Revenue growth", value: percent(scored.revenueGrowth, 1) },
              { label: "EBITDA", value: money(scored.ebitda) },
              { label: "EBITDA margin", value: percent(scored.ebitdaMargin) },
              { label: "Net debt", value: money(scored.netDebt) },
              {
                label: "EBITDA after market rent",
                value: owned ? money((scored.ebitda ?? 0) - scored.marketRent) : money(scored.ebitda),
              },
            ]}
          />
          <p className="mt-2 text-[10.5px] leading-relaxed text-stone">
            Terra estimates built from published fees, observed enrolment and segment margin
            benchmarks. Not reported figures.
          </p>
        </Section>

        <Section title="Property">
          {property ? (
            <>
              <Grid
                items={[
                  { label: "Tenure", value: humanise(record.tenure) },
                  { label: "Owner", value: property.propertyOwner ?? "—" },
                  { label: "Built area", value: property.builtAreaSqm ? `${exact(property.builtAreaSqm)} m²` : "—" },
                  { label: "Plot", value: property.plotSizeSqm ? `${exact(property.plotSizeSqm)} m²` : "—" },
                  {
                    label: owned ? "Estimated market rent" : "Passing rent",
                    value: money(owned ? property.marketRentEstimate : property.annualRent),
                  },
                  {
                    label: "Estimated value",
                    value: owned
                      ? moneyRange(property.valueEstimateLow, property.valueEstimateHigh)
                      : "Third-party owned",
                  },
                ]}
              />
              {property.tags.length ? (
                <p className="mt-2 text-[11px] text-graphite">
                  {property.tags.map(humanise).join(" · ")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[12px] text-stone">No property record.</p>
          )}
        </Section>

        <Section title="Why now">
          <p className="text-[12px] leading-relaxed text-graphite">
            {record.opportunities[0]?.whyNow ?? scored.score.evidence.join(". ")}
          </p>
          {record.signals.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {record.signals.slice(0, 4).map((s) => (
                <li key={s.id} className="text-[11.5px] leading-relaxed text-graphite">
                  <span className="num text-stone">{date(s.date)}</span> — {s.headline}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Potential transaction structures">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Structure</th>
                <th className="text-right">Founder liquidity</th>
                <th className="text-right">Control retained</th>
                <th className="text-right">Legacy</th>
                <th className="text-right">Estimated value</th>
              </tr>
            </thead>
            <tbody>
              {structures.slice(0, 5).map((s) => {
                const fit = legacyFit.find((f) => f.type === s.type)!;
                return (
                  <tr key={s.type}>
                    <td className="text-[11.5px] text-ink">
                      {STRUCTURE_LABELS[s.type]}
                      {s.type === thesis.recommendedStructure ? (
                        <span className="ml-1.5 text-[10px] text-stone">(recommended)</span>
                      ) : null}
                    </td>
                    <td className="num text-right text-[11.5px]">{money(s.founderProceeds)}</td>
                    <td className="text-right text-[11.5px] text-graphite">
                      {s.stakeRetained > 0 ? percent(s.stakeRetained) : s.controlRetained ? "Full" : "None"}
                    </td>
                    <td className="num text-right text-[11.5px]">{fit.legacyPreservation}</td>
                    <td className="num text-right text-[11.5px]">{money(s.enterpriseValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section title="Likely counterparties">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-2">Operating company</p>
              <ul className="space-y-1">
                {matches.opco.slice(0, 5).map((m) => (
                  <li key={m.mandateId} className="flex items-baseline justify-between gap-3">
                    <span className="text-[11.5px] text-graphite">{m.organisationName}</span>
                    <span className="num text-[11.5px] text-ink">{m.score}</span>
                  </li>
                ))}
                {matches.opco.length === 0 ? (
                  <li className="text-[11.5px] text-stone">No mandate currently fits.</li>
                ) : null}
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-2">Campus</p>
              <ul className="space-y-1">
                {matches.propco.slice(0, 4).map((m) => (
                  <li key={m.mandateId} className="flex items-baseline justify-between gap-3">
                    <span className="text-[11.5px] text-graphite">{m.organisationName}</span>
                    <span className="num text-[11.5px] text-ink">{m.score}</span>
                  </li>
                ))}
                {matches.propco.length === 0 ? (
                  <li className="text-[11.5px] text-stone">No property mandate fits.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Risks">
          {record.riskFlags.length === 0 && thesis.risks.length === 0 ? (
            <p className="text-[12px] text-stone">Nothing material identified.</p>
          ) : (
            <ul className="space-y-1.5">
              {record.riskFlags.map((r) => (
                <li key={r.id} className="text-[11.5px] leading-relaxed text-graphite">
                  <span className="text-ink">{humanise(r.type)}</span>{" "}
                  <span className="text-stone">({humanise(r.severity).toLowerCase()})</span> —{" "}
                  {r.rationale}
                </li>
              ))}
              {thesis.risks.map((r, i) => (
                <li key={`t${i}`} className="text-[11.5px] leading-relaxed text-graphite">
                  {r}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Terra relationship path">
          <p className="text-[12px] leading-relaxed text-ink">
            {access.best?.narrative ?? "No route identified."}
          </p>
          <p className="mt-1 text-[11px] text-stone">
            {thesis.access.label}
            {access.best ? ` · weakest link ${access.best.weakestLink} of 5` : ""}
          </p>
          <p className="mt-3 text-[12px] text-ink">
            <span className="eyebrow mr-2">Next action</span>
            {thesis.nextBestAction}
          </p>
        </Section>

        <Section title="Sources">
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {sources.map((s) => (
              <li key={s.name} className="text-[11px] text-graphite">
                {s.name}
                <span className="text-stone"> — reviewed {ageLabel(s.reviewed)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <footer className="print-block flex items-center justify-between border-t border-ink pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
            Illustrative demo data · Decision support, not a recommendation
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone">
            Confidential — Terra Capital · Prepared by {user.name}
          </p>
        </footer>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-block border-b border-rule-soft pb-5">
      <h2 className="eyebrow mb-2.5">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[10px] uppercase tracking-[0.08em] text-stone">{item.label}</dt>
          <dd className="num mt-0.5 text-[12px] text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
