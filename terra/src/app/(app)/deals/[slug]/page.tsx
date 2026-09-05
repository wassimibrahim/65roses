import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { loadDeal, stageDurations, BUYER_STAGES } from "@/server/deals";
import { PageHeader } from "@/components/shell/page-header";
import { EntityTabs } from "@/components/atlas/entity-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageChip } from "@/components/data/stage-chip";
import { ScoreBar } from "@/components/ui/score";
import { DefinitionGrid } from "@/components/data/definition-grid";
import { RiskList } from "@/components/data/risk-list";
import { DemoNotice } from "@/components/ui/provenance";
import { BuyerUniverse } from "@/components/deals/buyer-universe";
import { ProcessChecklist } from "@/components/deals/process-checklist";
import { money, percent, exact, date as fmtDate, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const { tab = "overview" } = await searchParams;

  const deal = await loadDeal(slug, user);
  if (!deal) notFound();

  if (deal === "RESTRICTED") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <Lock className="size-5 text-stone" />
        <h1 className="display text-[19px] text-ink">This process is restricted.</h1>
        <p className="max-w-sm text-[12px] text-stone">
          Access is limited to the deal team. Speak to the lead partner if you need to be added.
        </p>
        <Link href="/deals" className="text-[12px] text-graphite underline-offset-4 hover:underline">
          Back to deals
        </Link>
      </div>
    );
  }

  const basePath = `/deals/${slug}`;
  const asset = deal.assets[0]?.institution;
  const latest = asset?.financials[0];
  const durations = stageDurations(deal.stageHistory);
  const completeItems = deal.processItems.filter((p) => p.status === "COMPLETE").length;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "buyers", label: "Buyer universe", count: deal.buyerUniverse.length },
    { key: "process", label: "Process", count: deal.processItems.length },
    { key: "financials", label: "Financials" },
    { key: "stakeholders", label: "Continuity" },
    { key: "documents", label: "Documents", count: deal.documents.length },
    { key: "contacts", label: "Contacts", count: deal.participants.length },
    { key: "timeline", label: "Timeline", count: deal.interactions.length },
  ];

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Deals", href: "/deals" },
          { label: deal.codeName },
        ]}
        title={deal.codeName}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{humanise(deal.transactionType)}</span>
            <span className="text-stone-light">·</span>
            <span>{deal.clientLabel ?? deal.clientOrg?.name}</span>
            {asset ? (
              <>
                <span className="text-stone-light">·</span>
                <Link href={`/atlas/${asset.slug}`} className="hover:text-ink">
                  {asset.name}
                </Link>
              </>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/export/buyers?deal=${deal.slug}`}>Export buyers</a>
            </Button>
            <StageChip stage={deal.stage} />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-rule-soft bg-paper px-6 py-3 md:px-8">
        <Item label="Expected EV" value={money(deal.expectedEv)} />
        <Item label="Fee" value={money(deal.expectedFee)} />
        <Item label="Probability" value={percent(deal.probability)} />
        <Item label="Target close" value={fmtDate(deal.targetClose)} />
        <Item label="Lead" value={deal.leadPartner?.name ?? "—"} />
        <Item label="Analyst" value={deal.analyst?.name ?? "—"} />
        <div className="w-28">
          <div className="eyebrow mb-1">Process</div>
          <div className="num text-[12.5px] text-ink">
            {completeItems}/{deal.processItems.length}
          </div>
          <ScoreBar
            value={deal.processItems.length ? (completeItems / deal.processItems.length) * 100 : 0}
            className="mt-1.5"
          />
        </div>
      </div>

      {deal.keyBlocker ? (
        <div className="flex items-start gap-2 border-b border-burgundy/20 bg-burgundy-soft px-6 py-2.5 md:px-8">
          <AlertTriangle className="mt-px size-3.5 shrink-0 text-burgundy" />
          <p className="text-[12px] leading-relaxed text-burgundy">
            <span className="eyebrow mr-1.5 text-burgundy">Blocker</span>
            {deal.keyBlocker}
          </p>
        </div>
      ) : null}

      <EntityTabs tabs={tabs} active={tab} basePath={basePath} />

      <div className="px-6 py-6 md:px-8">
        {tab === "overview" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Panel>
                <PanelHeader title="Mandate" />
                <PanelBody>
                  <DefinitionGrid
                    columns={3}
                    items={[
                      { label: "Transaction type", value: humanise(deal.transactionType) },
                      { label: "Client", value: deal.clientLabel ?? deal.clientOrg?.name ?? "—" },
                      { label: "Current stage", value: humanise(deal.stage) },
                      { label: "Expected EV", value: money(deal.expectedEv), mono: true },
                      { label: "Expected fee", value: money(deal.expectedFee), mono: true },
                      { label: "Probability", value: percent(deal.probability), mono: true },
                      { label: "Fee structure", value: deal.feeStructure ?? "—" },
                      { label: "Target close", value: fmtDate(deal.targetClose), mono: true },
                      {
                        label: "Originated as",
                        value: deal.opportunity ? humanise(deal.opportunity.source) : "—",
                      },
                    ]}
                  />
                </PanelBody>
              </Panel>

              {deal.opportunity?.whyNow ? (
                <Panel>
                  <PanelHeader title="Why this happened now" />
                  <PanelBody>
                    <p className="max-w-3xl text-[12.5px] leading-relaxed text-graphite">
                      {deal.opportunity.whyNow}
                    </p>
                    {deal.opportunity.thesis ? (
                      <p className="mt-3 max-w-3xl border-t border-rule-soft pt-3 text-[12.5px] leading-relaxed text-graphite">
                        <span className="eyebrow mr-1.5">Thesis</span>
                        {deal.opportunity.thesis}
                      </p>
                    ) : null}
                  </PanelBody>
                </Panel>
              ) : null}

              <Panel>
                <PanelHeader title="Stage history" meta="Days in each stage" />
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Entered</th>
                      <th>Exited</th>
                      <th className="text-right">Days</th>
                      <th className="w-1/3" />
                    </tr>
                  </thead>
                  <tbody>
                    {durations.map((d, i) => (
                      <tr key={`${d.stage}-${i}`}>
                        <td className="text-[12px] text-ink">
                          {humanise(d.stage)}
                          {d.current ? (
                            <Badge tone="ink" mono className="ml-2">Current</Badge>
                          ) : null}
                        </td>
                        <td className="num text-[11px] text-graphite">{fmtDate(d.enteredAt)}</td>
                        <td className="num text-[11px] text-stone">
                          {d.exitedAt ? fmtDate(d.exitedAt) : "—"}
                        </td>
                        <td className="num text-right text-[11.5px]">{d.days}</td>
                        <td>
                          <ScoreBar
                            value={d.days}
                            max={Math.max(...durations.map((x) => x.days), 1)}
                            tone={d.current ? "forest" : "ink"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {deal.riskFlags.length > 0 ? (
                <Panel>
                  <PanelHeader title="Deal risks" meta={`${deal.riskFlags.length}`} />
                  <RiskList risks={deal.riskFlags} />
                </Panel>
              ) : null}
            </div>

            <div className="space-y-6">
              {asset ? (
                <Panel>
                  <PanelHeader title="Target asset" />
                  <PanelBody className="space-y-3">
                    <Link
                      href={`/atlas/${asset.slug}`}
                      className="display block text-[17px] text-ink hover:underline"
                    >
                      {asset.name}
                    </Link>
                    <DefinitionGrid
                      columns={2}
                      items={[
                        { label: "Location", value: [asset.city, asset.country].filter(Boolean).join(", ") },
                        { label: "Segment", value: humanise(asset.type) },
                        { label: "Students", value: exact(asset.students), mono: true },
                        { label: "Capacity", value: exact(asset.capacity), mono: true },
                        { label: "Ownership", value: humanise(asset.ownershipType) },
                        { label: "Campus", value: humanise(asset.tenure) },
                      ]}
                    />
                  </PanelBody>
                </Panel>
              ) : null}

              <Panel>
                <PanelHeader title="Open tasks" meta={`${deal.tasks.filter((t) => t.status !== "DONE").length}`} />
                {deal.tasks.length === 0 ? (
                  <EmptyState title="Nothing outstanding." />
                ) : (
                  <ul>
                    {deal.tasks.map((t) => (
                      <li key={t.id} className="border-b border-rule-soft px-4 py-2.5 last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12px] leading-snug text-ink">{t.title}</span>
                          <Badge tone={t.priority === "HIGH" ? "burgundy" : "quiet"} mono>
                            {humanise(t.priority)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10.5px] text-stone">
                          {t.assignee?.name ?? "Unassigned"}
                          {t.dueDate ? ` · due ${fmtDate(t.dueDate)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel>
                <PanelHeader title="Buyer funnel" />
                <PanelBody className="space-y-2">
                  {BUYER_STAGES.map((stage) => {
                    const count = deal.buyerUniverse.filter((b) => b.stage === stage).length;
                    if (count === 0) return null;
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-[11px] text-graphite">
                          {humanise(stage)}
                        </span>
                        <ScoreBar
                          value={count}
                          max={deal.buyerUniverse.length}
                          tone={stage === "SELECTED" ? "forest" : stage === "REJECTED" ? "burgundy" : "ink"}
                        />
                        <span className="num w-5 shrink-0 text-right text-[11px] text-stone">{count}</span>
                      </div>
                    );
                  })}
                </PanelBody>
              </Panel>
            </div>
          </div>
        ) : null}

        {tab === "buyers" ? (
          <BuyerUniverse
            stages={[...BUYER_STAGES]}
            rows={deal.buyerUniverse.map((b) => ({
              id: b.id,
              stage: b.stage,
              organisationName: b.organisation.name,
              organisationSlug: b.organisation.slug,
              organisationType: b.organisation.type,
              hq: b.organisation.hq,
              rationale: b.strategicRationale,
              relationshipStrength: b.relationshipStrength,
              ioiValue: b.ioiValue,
              loiValue: b.loiValue,
              notes: b.notes,
            }))}
          />
        ) : null}

        {tab === "process" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Transaction checklist"
                meta={`${completeItems} of ${deal.processItems.length} complete`}
              />
              <ProcessChecklist
                rows={deal.processItems.map((p) => ({
                  id: p.id,
                  label: p.label,
                  status: p.status,
                  dueDate: p.dueDate ? p.dueDate.toISOString() : null,
                  ownerName: p.ownerName,
                  critical: p.critical,
                }))}
              />
            </Panel>

            <Panel>
              <PanelHeader title="Critical deadlines" />
              {deal.processItems.filter((p) => p.critical && p.status !== "COMPLETE").length === 0 ? (
                <EmptyState title="No critical item outstanding." />
              ) : (
                <ul>
                  {deal.processItems
                    .filter((p) => p.critical && p.status !== "COMPLETE")
                    .map((p) => {
                      const overdue = p.dueDate && p.dueDate.getTime() < Date.now();
                      return (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-3 border-b border-rule-soft px-4 py-3 last:border-b-0"
                        >
                          <span className="text-[12.5px] text-ink">{p.label}</span>
                          <span className={`num text-[11.5px] ${overdue ? "text-burgundy" : "text-graphite"}`}>
                            {fmtDate(p.dueDate)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </Panel>
          </div>
        ) : null}

        {tab === "financials" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Target financials" meta={latest ? `FY${latest.year}` : undefined} />
              {latest ? (
                <PanelBody>
                  <DefinitionGrid
                    columns={2}
                    items={[
                      { label: "Revenue", value: money(latest.revenue), mono: true },
                      { label: "EBITDA", value: money(latest.ebitda), mono: true },
                      { label: "EBITDA margin", value: percent(latest.ebitdaMargin), mono: true },
                      { label: "Net debt", value: money(latest.netDebt), mono: true },
                      { label: "Capex", value: money(latest.capex), mono: true },
                      { label: "Students", value: exact(latest.students), mono: true },
                    ]}
                  />
                  <p className="mt-4 text-[11px] leading-relaxed text-stone">{latest.note}</p>
                </PanelBody>
              ) : (
                <EmptyState title="No financial record on the target." />
              )}
              {asset ? (
                <PanelBody className="border-t border-rule-soft py-3">
                  <Link
                    href={`/underwriting/${asset.slug}`}
                    className="text-[11.5px] text-graphite underline-offset-4 hover:underline"
                  >
                    Open the underwriting model →
                  </Link>
                </PanelBody>
              ) : null}
            </Panel>

            <Panel>
              <PanelHeader title="Offers received" />
              {deal.buyerUniverse.filter((b) => b.ioiValue || b.loiValue).length === 0 ? (
                <EmptyState title="No offer received yet." />
              ) : (
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Buyer</th>
                      <th>Stage</th>
                      <th className="text-right">IOI</th>
                      <th className="text-right">LOI</th>
                      <th className="text-right">vs expected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.buyerUniverse
                      .filter((b) => b.ioiValue || b.loiValue)
                      .map((b) => {
                        const best = b.loiValue ?? b.ioiValue ?? 0;
                        const delta = deal.expectedEv ? best / deal.expectedEv - 1 : null;
                        return (
                          <tr key={b.id}>
                            <td className="text-[12px] text-ink">{b.organisation.name}</td>
                            <td><Badge tone="neutral" mono>{humanise(b.stage)}</Badge></td>
                            <td className="num text-right text-[11.5px]">{money(b.ioiValue)}</td>
                            <td className="num text-right text-[11.5px]">{money(b.loiValue)}</td>
                            <td
                              className={`num text-right text-[11.5px] ${delta && delta >= 0 ? "text-forest" : "text-burgundy"}`}
                            >
                              {delta === null ? "—" : `${delta >= 0 ? "+" : ""}${percent(delta, 1)}`}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        ) : null}

        {tab === "stakeholders" ? (
          <Panel>
            <PanelHeader
              title="Stakeholder continuity"
              meta="Relevant to execution, not an ESG exercise"
            />
            {deal.stakeholders.length === 0 ? (
              <EmptyState title="No continuity analysis recorded." />
            ) : (
              <div className="overflow-x-auto">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th className="w-40">Group</th>
                      <th>Potential impact</th>
                      <th>Risk</th>
                      <th>Mitigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.stakeholders.map((s) => (
                      <tr key={s.id}>
                        <td className="text-[12.5px] text-ink">{humanise(s.group)}</td>
                        <td className="text-[11.5px] leading-relaxed text-graphite">{s.impact ?? "—"}</td>
                        <td className="text-[11.5px] leading-relaxed text-graphite">{s.risk ?? "—"}</td>
                        <td className="text-[11.5px] leading-relaxed text-graphite">{s.mitigation ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        ) : null}

        {tab === "documents" ? (
          <Panel>
            <PanelHeader title="Document library" meta={`${deal.documents.length}`} />
            {deal.documents.length === 0 ? (
              <EmptyState title="No document recorded." />
            ) : (
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Version</th>
                    <th>Added</th>
                    <th>Confidentiality</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.documents.map((d) => (
                    <tr key={d.id}>
                      <td className="text-[12.5px] text-ink">{d.title}</td>
                      <td className="text-[11.5px] text-graphite">{humanise(d.type)}</td>
                      <td className="num text-[11px] text-stone">{d.version ?? "—"}</td>
                      <td className="num text-[11px] text-stone">{fmtDate(d.createdAt)}</td>
                      <td>
                        {d.confidential ? (
                          <Badge tone="burgundy" mono>Restricted</Badge>
                        ) : (
                          <Badge tone="quiet" mono>Deal team</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <PanelBody className="border-t border-rule-soft py-3">
              <p className="text-[10.5px] leading-relaxed text-stone">
                Metadata only in this build. File storage sits behind a provider interface so a data
                room can be attached without touching the rest of the application.
              </p>
            </PanelBody>
          </Panel>
        ) : null}

        {tab === "contacts" ? (
          <Panel>
            <PanelHeader title="Deal contacts" meta={`${deal.participants.length}`} />
            {deal.participants.length === 0 ? (
              <EmptyState title="No participants recorded." />
            ) : (
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Organisation</th>
                    <th>Role</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.participants.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.person ? (
                          <Link href={`/relationships/${p.person.slug}`} className="text-[12.5px] text-ink hover:underline">
                            {p.person.firstName} {p.person.lastName}
                          </Link>
                        ) : (
                          <span className="text-[12.5px] text-graphite">—</span>
                        )}
                      </td>
                      <td className="text-[11.5px] text-graphite">{p.organisation?.name ?? "—"}</td>
                      <td><Badge tone="neutral" mono>{humanise(p.role)}</Badge></td>
                      <td className="text-[11px] text-stone">{p.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        ) : null}

        {tab === "timeline" ? (
          <Panel>
            <PanelHeader title="Process timeline" meta={`${deal.interactions.length} interactions`} />
            {deal.interactions.length === 0 ? (
              <EmptyState title="Nothing logged against this process yet." />
            ) : (
              <ol className="px-4 py-2">
                {deal.interactions.map((i) => (
                  <li key={i.id} className="relative border-l border-rule-soft py-3 pl-5">
                    <span className="absolute -left-[3px] top-[18px] size-[5px] rounded-full bg-linen" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="eyebrow">{humanise(i.type)}</span>
                      <span className="num text-[10px] text-stone">
                        {fmtDate(i.date)} · {relativeDays(i.date)}
                      </span>
                    </div>
                    <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink">{i.summary}</p>
                    <p className="mt-1 text-[10.5px] text-stone">
                      {i.participants.map((p) => `${p.person.firstName} ${p.person.lastName}`).join(", ")}
                      {i.loggedBy ? ` · logged by ${i.loggedBy.name}` : ""}
                    </p>
                    {i.nextStep ? (
                      <p className="mt-1 text-[11px] text-graphite">
                        <span className="eyebrow mr-1.5">Next</span>
                        {i.nextStep}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="num text-[12.5px] text-ink">{value}</div>
    </div>
  );
}
