import Link from "next/link";
import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { DefinitionGrid } from "@/components/data/definition-grid";
import { ScoreBreakdown } from "@/components/data/score-breakdown";
import { AssertionTag, ConfidenceMeter, StaleNotice, BasisTag } from "@/components/ui/provenance";
import { Badge } from "@/components/ui/badge";
import { AccessChip } from "@/components/data/access-chip";
import { money, moneyRange, exact, percent, ratio, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { RiskList } from "@/components/data/risk-list";

export function OverviewTab({
  profile,
  evidence,
}: {
  profile: InstitutionProfile;
  evidence: Map<string, { confidence: string; lastReviewed: Date | null; source: { name: string } | null }>;
}) {
  const { scored, record, matches, access } = profile;
  const property = record.properties[0];
  const latest = record.financials[record.financials.length - 1];
  const opportunity = record.opportunities[0];
  const studentEvidence = evidence.get("students");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {record.summary ? (
          <Panel>
            <PanelBody>
              <p className="max-w-3xl text-[13px] leading-relaxed text-graphite">{record.summary}</p>
            </PanelBody>
          </Panel>
        ) : null}

        {opportunity?.whyNow ? (
          <Panel>
            <PanelHeader
              title="Why now"
              action={<AssertionTag assertion="TERRA_HYPOTHESIS" />}
            />
            <PanelBody>
              <p className="max-w-3xl text-[13px] leading-relaxed text-ink">{opportunity.whyNow}</p>
              {opportunity.nextAction ? (
                <p className="mt-3 flex flex-wrap items-baseline gap-2 text-[12px] text-graphite">
                  <span className="eyebrow">Next action</span>
                  {opportunity.nextAction}
                  {opportunity.owner ? (
                    <span className="text-stone">· {opportunity.owner.name}</span>
                  ) : null}
                </p>
              ) : null}
            </PanelBody>
          </Panel>
        ) : null}

        <Panel>
          <PanelHeader title="Scale" meta="Terra estimates unless marked" />
          <PanelBody>
            <DefinitionGrid
              columns={4}
              items={[
                {
                  label: "Students",
                  value: (
                    <span className="flex items-center gap-2">
                      {exact(record.students)}
                      {studentEvidence ? (
                        <ConfidenceMeter confidence={studentEvidence.confidence as never} />
                      ) : null}
                    </span>
                  ),
                  mono: true,
                },
                { label: "Capacity", value: exact(record.capacity), mono: true },
                {
                  label: "Utilisation",
                  value: percent(record.utilisation),
                  hint: record.utilisation && record.utilisation > 0.9 ? "Growth needs capital" : undefined,
                  mono: true,
                },
                { label: "Campuses", value: String(record.campusCount), mono: true },
                {
                  label: "Tuition range",
                  value: `${money(record.tuitionLow)} – ${money(record.tuitionHigh)}`,
                  mono: true,
                },
                { label: "Average tuition", value: money(record.tuitionAverage), mono: true },
                { label: "Teachers", value: exact(record.teachers), mono: true },
                {
                  label: "Student / teacher",
                  value: ratio(record.studentTeacherRatio),
                  mono: true,
                },
              ]}
            />
            <StaleNotice
              field="Student count"
              lastVerified={studentEvidence?.lastReviewed}
              thresholdMonths={12}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Economics"
            meta={latest ? `FY${latest.year}` : undefined}
            action={latest ? <BasisTag basis={latest.basis} /> : null}
          />
          <PanelBody>
            <DefinitionGrid
              columns={4}
              items={[
                { label: "Revenue", value: money(scored.revenue), mono: true },
                { label: "Revenue growth", value: percent(scored.revenueGrowth, 1), mono: true },
                { label: "EBITDA", value: money(scored.ebitda), mono: true },
                { label: "EBITDA margin", value: percent(scored.ebitdaMargin), mono: true },
                {
                  label: "Market rent",
                  value: scored.marketRent ? money(scored.marketRent) : "n/a — leased",
                  hint: scored.marketRent ? "Charged against the OpCo in any separation" : undefined,
                  mono: true,
                },
                {
                  label: "EBITDA after rent",
                  value:
                    scored.ebitda !== null && scored.marketRent
                      ? money(scored.ebitda - scored.marketRent)
                      : money(scored.ebitda),
                  mono: true,
                },
                { label: "Net debt", value: money(scored.netDebt), mono: true },
                {
                  label: "Estimated EV",
                  value: moneyRange(scored.enterpriseValueLow, scored.enterpriseValueHigh),
                  hint: scored.propertyValueHigh ? "OpCo plus campus freehold" : "Operating company",
                  mono: true,
                },
              ]}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Ownership & succession" />
          <PanelBody>
            <DefinitionGrid
              columns={4}
              items={[
                { label: "Ownership type", value: humanise(record.ownershipType) },
                { label: "Family", value: record.familyName ? `${record.familyName} family` : "—" },
                { label: "Generation", value: humanise(record.generation) },
                {
                  label: "Founder age",
                  value: record.founderAge ? String(record.founderAge) : "Not known",
                  mono: true,
                },
                {
                  label: "Succession",
                  value: (
                    <span className="flex flex-wrap items-center gap-2">
                      {humanise(record.successionStatus)}
                      <AssertionTag assertion="TERRA_HYPOTHESIS" />
                    </span>
                  ),
                },
                { label: "Founded", value: record.foundedYear ? String(record.foundedYear) : "—", mono: true },
                { label: "Curriculum", value: record.curriculum.join(" · ") || "—" },
                { label: "Languages", value: record.languages.join(" · ") || "—" },
              ]}
            />
          </PanelBody>
        </Panel>

        {record.riskFlags.length > 0 ? (
          <Panel>
            <PanelHeader title="Risk flags" meta={`${record.riskFlags.length}`} />
            <RiskList risks={record.riskFlags} />
          </Panel>
        ) : null}
      </div>

      <div className="space-y-6">
        <Panel>
          <PanelHeader title="Terra Opportunity Score" meta="0–100" />
          <PanelBody>
            <ScoreBreakdown score={scored.score} overrideRationale={scored.overrideRationale} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Terra access" />
          <PanelBody className="space-y-3">
            <AccessChip tier={access.tier} />
            {access.best ? (
              <p className="text-[12px] leading-relaxed text-ink">{access.best.narrative}</p>
            ) : (
              <p className="text-[12px] text-stone">
                No route identified. An introduction has to be manufactured before any approach.
              </p>
            )}
            {access.alternatives.length > 0 ? (
              <div>
                <div className="eyebrow mb-1">Alternative routes</div>
                <ul className="space-y-0.5">
                  {access.alternatives.map((path, i) => (
                    <li key={i} className="text-[11px] leading-relaxed text-stone">
                      {path.narrative}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link
              href={`/relationships?focus=${record.id}`}
              className="inline-block text-[11.5px] text-graphite underline-offset-4 hover:underline"
            >
              Open in the relationship graph →
            </Link>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Top buyer matches"
            meta={`${matches.opco.length} OpCo · ${matches.propco.length} PropCo`}
          />
          <PanelBody className="space-y-3">
            {matches.opco.slice(0, 3).map((m) => (
              <div key={m.mandateId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[12px] text-ink">{m.organisationName}</span>
                <span className="num shrink-0 text-[12px] text-graphite">{m.score}</span>
              </div>
            ))}
            {matches.propco.length > 0 ? (
              <>
                <div className="eyebrow pt-1">PropCo</div>
                {matches.propco.slice(0, 2).map((m) => (
                  <div key={m.mandateId} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12px] text-ink">{m.organisationName}</span>
                    <span className="num shrink-0 text-[12px] text-graphite">{m.score}</span>
                  </div>
                ))}
              </>
            ) : null}
          </PanelBody>
        </Panel>

        {record.interactions.length > 0 ? (
          <Panel>
            <PanelHeader title="Latest contact" />
            <PanelBody className="space-y-2">
              <p className="text-[10.5px] text-stone">
                {humanise(record.interactions[0]!.type)} · {relativeDays(record.interactions[0]!.date)}
              </p>
              <p className="text-[12px] leading-relaxed text-graphite">
                {record.interactions[0]!.summary}
              </p>
            </PanelBody>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
