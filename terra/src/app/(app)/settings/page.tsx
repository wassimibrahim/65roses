import Link from "next/link";
import { requireUser, ROLE_LABELS, canSeeConfidential } from "@/lib/rbac";
import { pipelineAnalytics, dataQuality, recentAudit, teamRoster } from "@/server/analytics";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { EntityTabs } from "@/components/atlas/entity-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score";
import { Flywheel } from "@/components/settings/flywheel";
import { AssertionTag, DemoNotice } from "@/components/ui/provenance";
import { ActivityChart } from "@/components/charts/activity-chart";
import { money, percent, exact, ageLabel, date as fmtDate } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { ACCESS_LABELS } from "@/lib/engine/graph";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab = "analytics" } = await searchParams;

  const [analytics, quality, audit, team, counts] = await Promise.all([
    pipelineAnalytics(),
    dataQuality(),
    canSeeConfidential(user.role) ? recentAudit(60) : Promise.resolve([]),
    teamRoster(),
    db.$transaction([
      db.educationInstitution.count(),
      db.interaction.count(),
      db.investorMandate.count({ where: { isActive: true } }),
      db.deal.count(),
      db.transactionComparable.count(),
      db.relationship.count(),
    ]),
  ]);

  const [institutions, interactions, mandates, deals, comparables, relationships] = counts;

  const tabs = [
    { key: "analytics", label: "Analytics" },
    { key: "strategy", label: "Strategy" },
    { key: "quality", label: "Data quality", count: quality.stale },
    { key: "team", label: "Team", count: team.length },
    { key: "audit", label: "Audit", count: audit.length },
    { key: "system", label: "System" },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Settings" }]}
        title="Settings"
        subtitle="Analytics, data quality, access and the record of what changed."
      />

      <EntityTabs tabs={tabs} active={tab} basePath="/settings" />

      <div className="px-6 py-6 md:px-8">
        {tab === "analytics" ? (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Live pipeline EV" value={money(analytics.headline.pipelineEv)} />
              <Stat label="Weighted fees" value={money(analytics.headline.weightedFees)} />
              <Stat label="Origination EV" value={money(analytics.headline.originationEv)} />
              <Stat label="Active mandates" value={String(analytics.headline.activeMandates)} />
              <Stat label="Universe EV" value={money(analytics.headline.universeEv)} />
              <Stat label="Institutions" value={String(analytics.headline.institutions)} />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel>
                <PanelHeader title="Mandates by stage" meta="Live processes" />
                <PanelBody className="space-y-2.5">
                  {analytics.byStage.map((s) => (
                    <Bar
                      key={s.stage}
                      label={humanise(s.stage)}
                      value={s.count}
                      max={Math.max(...analytics.byStage.map((x) => x.count), 1)}
                      right={money(s.ev)}
                    />
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Average days by deal stage" meta="Completed stages only" />
                <PanelBody className="space-y-2.5">
                  {analytics.stageDays.length === 0 ? (
                    <p className="text-[12px] text-stone">No stage has been completed yet.</p>
                  ) : (
                    analytics.stageDays.map((s) => (
                      <Bar
                        key={s.stage}
                        label={humanise(s.stage)}
                        value={s.average}
                        max={Math.max(...analytics.stageDays.map((x) => x.average), 1)}
                        right={`${s.average}d · n=${s.samples}`}
                      />
                    ))
                  )}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Origination by source" />
                <PanelBody className="space-y-2.5">
                  {analytics.bySource.map((s) => (
                    <Bar
                      key={s.source}
                      label={humanise(s.source)}
                      value={s.count}
                      max={Math.max(...analytics.bySource.map((x) => x.count), 1)}
                      right={`${s.count} · ${money(s.ev)}`}
                    />
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Origination conversion" meta="Share reaching each stage" />
                <PanelBody className="space-y-2.5">
                  {analytics.conversion.map((c) => (
                    <Bar
                      key={c.stage}
                      label={humanise(c.stage)}
                      value={c.count}
                      max={Math.max(...analytics.conversion.map((x) => x.count), 1)}
                      right={`${c.count} · ${percent(c.rate)}`}
                    />
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Universe by geography" />
                <PanelBody className="space-y-2.5">
                  {analytics.byCountry.map((c) => (
                    <Bar
                      key={c.country}
                      label={c.country}
                      value={c.ev}
                      max={Math.max(...analytics.byCountry.map((x) => x.ev), 1)}
                      right={`${c.count} · ${money(c.ev)}`}
                    />
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Universe by segment" />
                <PanelBody className="space-y-2.5">
                  {analytics.bySegment.slice(0, 8).map((s) => (
                    <Bar
                      key={s.segment}
                      label={humanise(s.segment)}
                      value={s.count}
                      max={Math.max(...analytics.bySegment.map((x) => x.count), 1)}
                      right={`${s.count} · ${money(s.ev)}`}
                    />
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Opportunities by score" />
                <PanelBody className="space-y-2.5">
                  {analytics.scoreBands.map((b) => (
                    <Bar
                      key={b.label}
                      label={b.label}
                      value={b.count}
                      max={Math.max(...analytics.scoreBands.map((x) => x.count), 1)}
                      right={String(b.count)}
                      tone={b.min >= 70 ? "forest" : "ink"}
                    />
                  ))}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Relationship activity" meta="Interactions logged per month" />
                <PanelBody>
                  <ActivityChart data={analytics.activity} />
                </PanelBody>
              </Panel>
            </div>
          </div>
        ) : null}

        {tab === "strategy" ? (
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Terra network advantage" meta="How the firm reaches its market" />
              <PanelBody className="space-y-3">
                {(["DIRECT", "WARM_INTRODUCTION", "SECOND_DEGREE", "COLD"] as const).map((tier) => (
                  <Bar
                    key={tier}
                    label={ACCESS_LABELS[tier]}
                    value={analytics.advantage.share[tier] * 100}
                    max={100}
                    right={`${analytics.advantage.counts[tier]} · ${percent(analytics.advantage.share[tier])}`}
                    tone={tier === "COLD" ? "burgundy" : tier === "DIRECT" ? "forest" : "ink"}
                  />
                ))}
                <p className="pt-2 text-[11.5px] leading-relaxed text-stone">
                  {percent(
                    analytics.advantage.share.DIRECT + analytics.advantage.share.WARM_INTRODUCTION,
                  )}{" "}
                  of the tracked universe is reachable without a cold approach. Raising that number
                  is the strategic objective the rest of this software serves.
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="The flywheel" meta="Internal" />
              <PanelBody>
                <Flywheel
                  stages={[
                    { label: "Research", count: institutions, unit: "institutions" },
                    { label: "Relationships", count: relationships, unit: "edges" },
                    { label: "Opportunities", count: analytics.bySource.reduce((a, s) => a + s.count, 0), unit: "open" },
                    { label: "Mandates", count: mandates, unit: "active" },
                    { label: "Transactions", count: deals, unit: "processes" },
                    { label: "Comparables", count: comparables, unit: "precedents" },
                    { label: "Intelligence", count: interactions, unit: "interactions" },
                  ]}
                />
              </PanelBody>
            </Panel>
          </div>
        ) : null}

        {tab === "quality" ? (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Assertions recorded" value={String(quality.total)} />
              <Stat
                label="Needing re-verification"
                value={String(quality.stale)}
                tone={quality.stale > 0 ? "burgundy" : undefined}
              />
              <Stat label="Facts" value={String(quality.byAssertion.FACT)} />
              <Stat label="Estimates" value={String(quality.byAssertion.ESTIMATE)} />
              <Stat label="Signals" value={String(quality.byAssertion.SIGNAL)} />
              <Stat label="Hypotheses" value={String(quality.byAssertion.TERRA_HYPOTHESIS)} />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel>
                <PanelHeader title="By field" meta="Stale means unreviewed for over a year" />
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th className="text-right">Records</th>
                      <th className="text-right">Verified</th>
                      <th className="text-right">Unverified</th>
                      <th className="text-right">Stale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quality.byField.map((f) => (
                      <tr key={f.field}>
                        <td className="text-[12px] text-ink">{humanise(f.field)}</td>
                        <td className="num text-right text-[11.5px]">{f.total}</td>
                        <td className="num text-right text-[11.5px] text-forest">{f.verified}</td>
                        <td className="num text-right text-[11.5px] text-stone">{f.unverified}</td>
                        <td
                          className={`num text-right text-[11.5px] ${f.stale > 0 ? "text-burgundy" : ""}`}
                        >
                          {f.stale}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel>
                <PanelHeader title="By source" />
                <PanelBody className="space-y-2.5">
                  {quality.bySource.slice(0, 12).map((s) => (
                    <Bar
                      key={s.source}
                      label={s.source}
                      value={s.count}
                      max={Math.max(...quality.bySource.map((x) => x.count), 1)}
                      right={String(s.count)}
                    />
                  ))}
                </PanelBody>
              </Panel>
            </div>

            <Panel>
              <PanelHeader title="The four classes" />
              <PanelBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["FACT", "Something Terra can point at."],
                    ["ESTIMATE", "Terra's own arithmetic."],
                    ["SIGNAL", "An observed event."],
                    ["TERRA_HYPOTHESIS", "Terra's reading of one."],
                  ] as const
                ).map(([key, description]) => (
                  <div key={key}>
                    <AssertionTag assertion={key} />
                    <p className="mt-2 text-[11.5px] leading-relaxed text-graphite">{description}</p>
                    <p className="num mt-1 text-[15px] text-ink">
                      {quality.byAssertion[key]}
                    </p>
                  </div>
                ))}
              </PanelBody>
            </Panel>
          </div>
        ) : null}

        {tab === "team" ? (
          <Panel>
            <PanelHeader title="Team and access" meta={`${team.length} users`} />
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th className="text-right">Opportunities</th>
                  <th className="text-right">Deals led</th>
                  <th className="text-right">Relationships</th>
                  <th>Confidential access</th>
                </tr>
              </thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.id}>
                    <td className="text-[12.5px] text-ink">{t.name}</td>
                    <td><Badge tone="neutral" mono>{ROLE_LABELS[t.role]}</Badge></td>
                    <td className="text-[11.5px] text-graphite">{t.email}</td>
                    <td className="num text-right text-[11.5px]">{t._count.ownedOpportunities}</td>
                    <td className="num text-right text-[11.5px]">{t._count.ledDeals}</td>
                    <td className="num text-right text-[11.5px]">{t._count.ownedRelationships}</td>
                    <td className="text-[11.5px] text-graphite">
                      {canSeeConfidential(t.role) ? "Partner confidential" : "Standard"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PanelBody className="border-t border-rule-soft py-3">
              <p className="text-[11px] leading-relaxed text-stone">
                Authorisation is enforced in a single server-side guard. Analysts and associates see
                general relationships and unrestricted deals; partner-confidential notes and
                restricted processes require partner rank, and opening one writes an audit row.
              </p>
            </PanelBody>
          </Panel>
        ) : null}

        {tab === "audit" ? (
          canSeeConfidential(user.role) ? (
            <Panel>
              <PanelHeader title="Audit log" meta={`${audit.length} most recent events`} />
              {audit.length === 0 ? (
                <EmptyState title="Nothing recorded yet." />
              ) : (
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Who</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Field</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td className="num text-[11px] text-stone">{fmtDate(a.createdAt)}</td>
                        <td className="text-[11.5px] text-graphite">{a.user?.name ?? "System"}</td>
                        <td><Badge tone="quiet" mono>{humanise(a.action)}</Badge></td>
                        <td className="text-[11.5px] text-graphite">{humanise(a.entityType)}</td>
                        <td className="text-[11.5px] text-stone">{a.field ?? "—"}</td>
                        <td className="max-w-[130px] truncate text-[11px] text-stone">
                          {a.previousValue ?? "—"}
                        </td>
                        <td className="max-w-[130px] truncate text-[11px] text-graphite">
                          {a.newValue ?? "—"}
                        </td>
                        <td className="max-w-[260px] truncate text-[11px] text-stone">
                          {a.context ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          ) : (
            <EmptyState
              title="The audit log is restricted."
              hint="Partner rank or above is required."
            />
          )
        ) : null}

        {tab === "system" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Database" />
              <PanelBody className="space-y-2">
                <Row label="Institutions" value={exact(institutions)} />
                <Row label="Relationships" value={exact(relationships)} />
                <Row label="Interactions" value={exact(interactions)} />
                <Row label="Active mandates" value={exact(mandates)} />
                <Row label="Processes" value={exact(deals)} />
                <Row label="Precedent transactions" value={exact(comparables)} />
                <Row label="Evidence records" value={exact(quality.total)} />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Integrations" meta="All optional; none required for the MVP" />
              <PanelBody className="space-y-2.5">
                <Integration name="Market data (PitchBook, Capital IQ, registries)" status="Interface ready · no provider configured" />
                <Integration name="Document storage / data room" status="Metadata only · provider interface in place" />
                <Integration name="Terra Intelligence model" status={process.env.LLM_PROVIDER && process.env.LLM_PROVIDER !== "none" ? "External provider configured" : "Local deterministic queries only"} />
                <Integration name="Map (Mapbox)" status={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? "Token present" : "No token · list and schematic view"} />
                <p className="pt-2 text-[11px] leading-relaxed text-stone">
                  Confidential material is never sent to an external model unless that is explicitly
                  configured. With no provider set, Terra Intelligence answers entirely from the
                  local database.
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Import" />
              <PanelBody className="space-y-3">
                <p className="text-[12px] leading-relaxed text-graphite">
                  Terra almost certainly already has spreadsheets. CSV import maps columns, previews
                  the parsed rows, validates them and flags duplicates before anything is written.
                </p>
                <Link
                  href="/settings/import"
                  className="inline-block text-[12px] text-graphite underline-offset-4 hover:text-ink hover:underline"
                >
                  Open CSV import →
                </Link>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Scoring weights" />
              <PanelBody className="space-y-2">
                <Row label="Strategic attractiveness" value="20%" />
                <Row label="Financial quality" value="20%" />
                <Row label="Transaction likelihood" value="20%" />
                <Row label="Buyer demand" value="15%" />
                <Row label="Real-estate optionality" value="10%" />
                <Row label="Terra relationship advantage" value="15%" />
                <p className="pt-2 text-[11px] leading-relaxed text-stone">
                  Weights are stored in the database and normalised at scoring time, so a firm that
                  weights relationships more heavily than the default can say so without a code
                  change.
                </p>
              </PanelBody>
            </Panel>
          </div>
        ) : null}

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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "burgundy" }) {
  return (
    <div className="bg-ivory px-3.5 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`num mt-0.5 text-[14px] ${tone === "burgundy" ? "text-burgundy" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  right,
  tone = "ink",
}: {
  label: string;
  value: number;
  max: number;
  right: string;
  tone?: "ink" | "forest" | "burgundy";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-ink">{label}</span>
        <span className="num text-[11px] text-stone">{right}</span>
      </div>
      <ScoreBar value={value} max={max} className="mt-1" tone={tone} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-graphite">{label}</span>
      <span className="num text-[12.5px] text-ink">{value}</span>
    </div>
  );
}

function Integration({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft pb-2 last:border-b-0">
      <span className="text-[12px] text-ink">{name}</span>
      <span className="shrink-0 text-[10.5px] text-stone">{status}</span>
    </div>
  );
}
