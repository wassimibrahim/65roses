import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { loadInvestorProfile } from "@/server/investors";
import { targetsForMandate } from "@/server/matching";
import { PageHeader } from "@/components/shell/page-header";
import { EntityTabs } from "@/components/atlas/entity-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { StrengthMarks, ScoreMark, ScoreBar } from "@/components/ui/score";
import { StageChip } from "@/components/data/stage-chip";
import { AccessChip } from "@/components/data/access-chip";
import { DefinitionGrid } from "@/components/data/definition-grid";
import { DemoNotice, DecisionSupportNote } from "@/components/ui/provenance";
import { money, moneyRange, percent, exact, date, relativeDays, ageLabel } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await loadInvestorProfile(slug);
  return { title: profile?.organisation.name ?? "Investor" };
}

export default async function InvestorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; mandate?: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const { tab = "overview", mandate: mandateParam } = await searchParams;

  const profile = await loadInvestorProfile(slug);
  if (!profile) notFound();
  const { organisation: org, relationship } = profile;

  const activeMandates = org.mandates.filter((m) => m.isActive);
  const selectedMandate =
    org.mandates.find((m) => m.id === mandateParam) ?? activeMandates[0] ?? org.mandates[0] ?? null;

  // "Find Targets" — the reverse match. Runs only on the tab that needs it.
  const targets =
    tab === "targets" && selectedMandate
      ? await targetsForMandate(selectedMandate.id, { limit: 25 })
      : [];

  const basePath = `/investors/${slug}`;
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "mandates", label: "Mandates", count: org.mandates.length },
    { key: "targets", label: "Find targets" },
    { key: "contacts", label: "Contacts", count: org.people.length },
    { key: "activity", label: "Activity", count: org.interactions.length },
    { key: "deals", label: "Processes", count: org.buyerEntries.length },
  ];

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Investors", href: "/investors" },
          { label: org.name },
        ]}
        title={org.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{humanise(org.type)}</span>
            {org.hq ? (
              <>
                <span className="text-stone-light">·</span>
                <span>{org.hq}</span>
              </>
            ) : null}
            {org.aum ? (
              <>
                <span className="text-stone-light">·</span>
                <span>{money(org.aum)} {org.aumNote ? `(${org.aumNote.toLowerCase()})` : ""}</span>
              </>
            ) : null}
          </span>
        }
        actions={
          org.isPublicExample ? (
            <Badge tone="quiet" mono>Public market example</Badge>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-rule-soft bg-paper px-6 py-3 md:px-8">
        <div>
          <div className="eyebrow mb-1">Terra relationship</div>
          <StrengthMarks strength={relationship} />
        </div>
        <Item label="Active mandates" value={String(activeMandates.length)} />
        <Item label="Countries" value={org.countriesActive.join(", ") || "—"} />
        <Item label="Owned assets" value={String(org.institutions.length)} />
        <Item label="Live processes" value={String(org.buyerEntries.length)} />
      </div>

      <EntityTabs tabs={tabs} active={tab} basePath={basePath} />

      <div className="px-6 py-6 md:px-8">
        {tab === "overview" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              {org.summary ? (
                <Panel>
                  <PanelBody>
                    <p className="max-w-3xl text-[13px] leading-relaxed text-graphite">{org.summary}</p>
                  </PanelBody>
                </Panel>
              ) : null}

              <Panel>
                <PanelHeader title="Profile" />
                <PanelBody>
                  <DefinitionGrid
                    columns={3}
                    items={[
                      { label: "Type", value: humanise(org.type) },
                      { label: "Headquarters", value: org.hq ?? "—" },
                      { label: "Capital", value: org.aum ? money(org.aum) : "Not disclosed", mono: true },
                      { label: "Countries active", value: org.countriesActive.join(" · ") || "—" },
                      { label: "Education exposure", value: org.educationExposure ?? "—" },
                      {
                        label: "Relevant investments",
                        value: org.relevantInvestments.join(" · ") || "—",
                      },
                    ]}
                  />
                </PanelBody>
              </Panel>

              {org.institutions.length > 0 ? (
                <Panel>
                  <PanelHeader title="Owned institutions" meta={`${org.institutions.length}`} />
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        <th>Location</th>
                        <th>Segment</th>
                        <th className="text-right">Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.institutions.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <Link href={`/atlas/${i.slug}`} className="text-[12.5px] text-ink hover:underline">
                              {i.name}
                            </Link>
                          </td>
                          <td className="text-[11.5px] text-graphite">{[i.city, i.country].filter(Boolean).join(", ")}</td>
                          <td className="text-[11.5px] text-graphite">{humanise(i.type)}</td>
                          <td className="num text-right text-[11.5px]">{exact(i.students)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              ) : null}

              {org.intelLinks.length > 0 ? (
                <Panel>
                  <PanelHeader title="Market intelligence" meta={`${org.intelLinks.length}`} />
                  <ul>
                    {org.intelLinks.map((link) => (
                      <li key={link.id} className="border-b border-rule-soft px-4 py-3 last:border-b-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="eyebrow">{humanise(link.item.category)}</span>
                          <span className="num text-[10px] text-stone">{date(link.item.date)}</span>
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink">{link.item.title}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-graphite">
                          {link.item.summary}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </div>

            <div className="space-y-6">
              <Panel>
                <PanelHeader title="Live mandates" meta={`${activeMandates.length}`} />
                {activeMandates.length === 0 ? (
                  <EmptyState title="No live mandate." hint="Nothing to match against today." />
                ) : (
                  <ul>
                    {activeMandates.map((m) => (
                      <li key={m.id} className="border-b border-rule-soft px-4 py-3 last:border-b-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12.5px] text-ink">{m.name}</span>
                          <Badge tone="forest" mono>{humanise(m.status)}</Badge>
                        </div>
                        {m.strategy ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-graphite">{m.strategy}</p>
                        ) : null}
                        <p className="mt-1.5 text-[10.5px] text-stone">
                          Confirmed {ageLabel(m.lastConfirmed)}
                          {m.owner ? ` · ${m.owner.name}` : ""}
                        </p>
                        <Link
                          href={`${basePath}?tab=targets&mandate=${m.id}`}
                          className="mt-1.5 inline-block text-[11px] text-graphite underline-offset-4 hover:underline"
                        >
                          Find targets →
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel>
                <PanelHeader title="Key contacts" meta={`${org.people.length}`} />
                <ul>
                  {org.people.slice(0, 6).map((p) => (
                    <li key={p.id} className="border-b border-rule-soft px-4 py-2.5 last:border-b-0">
                      <Link href={`/relationships/${p.slug}`} className="text-[12px] text-ink hover:underline">
                        {p.firstName} {p.lastName}
                      </Link>
                      <p className="text-[10.5px] text-stone">{p.title}</p>
                    </li>
                  ))}
                </ul>
              </Panel>

              {org.interactions[0] ? (
                <Panel>
                  <PanelHeader title="Latest contact" />
                  <PanelBody className="space-y-2">
                    <p className="text-[10.5px] text-stone">
                      {humanise(org.interactions[0].type)} · {relativeDays(org.interactions[0].date)}
                    </p>
                    <p className="text-[12px] leading-relaxed text-graphite">
                      {org.interactions[0].summary}
                    </p>
                  </PanelBody>
                </Panel>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "mandates" ? (
          <div className="space-y-6">
            {org.mandates.length === 0 ? (
              <EmptyState title="No mandate recorded for this organisation." />
            ) : (
              org.mandates.map((m) => (
                <Panel key={m.id}>
                  <PanelHeader
                    title={m.name}
                    meta={`${humanise(m.status)} · confirmed ${ageLabel(m.lastConfirmed)}`}
                    action={
                      <Link
                        href={`${basePath}?tab=targets&mandate=${m.id}`}
                        className="text-[11px] text-stone hover:text-ink"
                      >
                        Find targets →
                      </Link>
                    }
                  />
                  <PanelBody className="space-y-5">
                    {m.strategy ? (
                      <p className="max-w-3xl text-[12.5px] leading-relaxed text-graphite">{m.strategy}</p>
                    ) : null}
                    {m.criteria ? (
                      <DefinitionGrid
                        columns={4}
                        items={[
                          {
                            label: "Enterprise value",
                            value: moneyRange(m.criteria.minEv, m.criteria.maxEv),
                            mono: true,
                          },
                          {
                            label: "EBITDA",
                            value: moneyRange(m.criteria.minEbitda, m.criteria.maxEbitda),
                            mono: true,
                          },
                          {
                            label: "Equity cheque",
                            value: money(m.criteria.equityCheque),
                            mono: true,
                          },
                          {
                            label: "Target ownership",
                            value: percent(m.criteria.targetOwnershipPct),
                            mono: true,
                          },
                          { label: "Control", value: humanise(m.criteria.control) },
                          {
                            label: "Students",
                            value:
                              m.criteria.minStudents || m.criteria.maxStudents
                                ? `${exact(m.criteria.minStudents)} – ${exact(m.criteria.maxStudents)}`
                                : "—",
                            mono: true,
                          },
                          { label: "Geography", value: m.criteria.countries.join(" · ") || "Any" },
                          { label: "Regions", value: m.criteria.regions.join(" · ") || "Any" },
                          {
                            label: "Segments",
                            value: m.criteria.segments.map(humanise).join(" · ") || "Any",
                          },
                          { label: "Curriculum", value: m.criteria.curricula.join(" · ") || "Any" },
                          {
                            label: "Property preference",
                            value: humanise(m.criteria.propertyPreference),
                            hint: m.criteria.requiresOwnedProperty
                              ? "Freehold required"
                              : m.criteria.leaseAcceptable
                                ? "Leasehold acceptable"
                                : "Leasehold not acceptable",
                          },
                          {
                            label: "Return target",
                            value: percent(m.criteria.returnTarget),
                            hint: m.criteria.holdingPeriod ? `${m.criteria.holdingPeriod}-year hold` : undefined,
                            mono: true,
                          },
                          { label: "Strategy", value: m.criteria.platformStrategy ? humanise(m.criteria.platformStrategy) : "—" },
                          { label: "ESG", value: m.criteria.esgRequirements ?? "—" },
                        ]}
                      />
                    ) : (
                      <p className="text-[12px] text-stone">No criteria captured for this mandate.</p>
                    )}
                    {m.notes ? (
                      <p className="max-w-3xl border-t border-rule-soft pt-3 text-[11.5px] leading-relaxed text-graphite">
                        <span className="eyebrow mr-1.5">Note</span>
                        {m.notes}
                      </p>
                    ) : null}
                  </PanelBody>
                </Panel>
              ))
            )}
          </div>
        ) : null}

        {tab === "targets" ? (
          <div className="space-y-6">
            {org.mandates.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="eyebrow mr-1">Mandate</span>
                {org.mandates.map((m) => (
                  <Link
                    key={m.id}
                    href={`${basePath}?tab=targets&mandate=${m.id}`}
                    className={`rounded-sm border px-2 py-1 text-[11.5px] ${
                      m.id === selectedMandate?.id
                        ? "border-ink bg-ink text-ivory"
                        : "border-rule bg-ivory text-graphite hover:bg-paper"
                    }`}
                  >
                    {m.name}
                  </Link>
                ))}
              </div>
            ) : null}

            {!selectedMandate ? (
              <EmptyState
                title="No mandate to match against."
                hint="Capture the buyer's criteria and Terra can rank the entire Atlas against it."
              />
            ) : (
              <Panel>
                <PanelHeader
                  title={`Targets for ${selectedMandate.name}`}
                  meta={`${targets.length} institutions ranked against the stated criteria`}
                />
                {targets.length === 0 ? (
                  <EmptyState title="Nothing in the Atlas fits this mandate." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="grid-table">
                      <thead>
                        <tr>
                          <th className="w-10 text-right">Fit</th>
                          <th>Institution</th>
                          <th>Location</th>
                          <th>Segment</th>
                          <th>Ownership</th>
                          <th className="text-right">Students</th>
                          <th className="text-right">Est. EV</th>
                          <th>Why it fits</th>
                          <th>Access</th>
                          <th className="text-right">Terra score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targets.map((t) => (
                          <tr key={t.institutionId}>
                            <td className="text-right">
                              <span
                                className={`num text-[15px] ${t.score >= 80 ? "text-forest" : t.score >= 60 ? "text-ink" : "text-stone"}`}
                              >
                                {t.score}
                              </span>
                            </td>
                            <td className="max-w-[200px]">
                              <Link
                                href={`/atlas/${t.institution.slug}`}
                                className="text-[12.5px] text-ink hover:underline"
                              >
                                {t.institution.name}
                              </Link>
                              {t.institution.hasOpportunity ? (
                                <span className="ml-1.5 text-[9px] text-forest" title="Already in origination">●</span>
                              ) : null}
                            </td>
                            <td className="text-[11.5px] text-graphite">{t.institution.city}</td>
                            <td className="text-[11.5px] text-graphite">{humanise(t.institution.type)}</td>
                            <td className="text-[11.5px] text-graphite">{humanise(t.institution.ownershipType)}</td>
                            <td className="num text-right text-[11.5px]">{exact(t.institution.students)}</td>
                            <td className="num text-right text-[11.5px]">
                              {moneyRange(t.institution.enterpriseValueLow, t.institution.enterpriseValueHigh)}
                            </td>
                            <td className="max-w-[280px]">
                              <ul className="space-y-0.5">
                                {t.reasons.slice(0, 2).map((r, i) => (
                                  <li key={i} className="text-[10.5px] leading-snug text-graphite">
                                    <span className="text-forest">+</span> {r}
                                  </li>
                                ))}
                                {t.issues.slice(0, 1).map((r, i) => (
                                  <li key={i} className="text-[10.5px] leading-snug text-stone">
                                    <span className="text-burgundy">−</span> {r}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td><AccessChip tier={t.institution.accessTier} /></td>
                            <td className="text-right">
                              <ScoreMark score={t.institution.displayScore} size="sm" className="items-end" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <PanelBody className="border-t border-rule-soft py-3">
                  <DecisionSupportNote />
                </PanelBody>
              </Panel>
            )}
          </div>
        ) : null}

        {tab === "contacts" ? (
          <Panel>
            <PanelHeader title="Contacts" meta={`${org.people.length}`} />
            {org.people.length === 0 ? (
              <EmptyState title="No contacts recorded." />
            ) : (
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Location</th>
                    <th>Languages</th>
                    <th>Interests</th>
                  </tr>
                </thead>
                <tbody>
                  {org.people.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/relationships/${p.slug}`} className="text-[12.5px] text-ink hover:underline">
                          {p.firstName} {p.lastName}
                        </Link>
                      </td>
                      <td className="text-[11.5px] text-graphite">{p.title ?? "—"}</td>
                      <td className="text-[11.5px] text-graphite">{p.location ?? "—"}</td>
                      <td className="text-[11px] text-stone">{p.languages.join(", ")}</td>
                      <td className="text-[11px] text-stone">{p.professionalInterests.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        ) : null}

        {tab === "activity" ? (
          <Panel>
            <PanelHeader title="Interaction history" meta={`${org.interactions.length}`} />
            {org.interactions.length === 0 ? (
              <EmptyState title="No interactions logged." />
            ) : (
              <ol className="px-4 py-2">
                {org.interactions.map((i) => (
                  <li key={i.id} className="relative border-l border-rule-soft py-3 pl-5">
                    <span className="absolute -left-[3px] top-[18px] size-[5px] rounded-full bg-linen" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="eyebrow">{humanise(i.type)}</span>
                      <span className="num text-[10px] text-stone">{date(i.date)}</span>
                    </div>
                    <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink">{i.summary}</p>
                    <p className="mt-1 text-[10.5px] text-stone">
                      {i.participants.map((p) => `${p.person.firstName} ${p.person.lastName}`).join(", ")}
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

        {tab === "deals" ? (
          <Panel>
            <PanelHeader title="Processes this counterparty is in" meta={`${org.buyerEntries.length}`} />
            {org.buyerEntries.length === 0 ? (
              <EmptyState title="Not currently in any Terra process." />
            ) : (
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Process</th>
                    <th>Deal stage</th>
                    <th>Buyer stage</th>
                    <th className="text-right">IOI</th>
                    <th className="text-right">LOI</th>
                    <th>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {org.buyerEntries.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/deals/${b.deal.slug}`} className="text-[12.5px] text-ink hover:underline">
                          {b.deal.codeName}
                        </Link>
                      </td>
                      <td><StageChip stage={b.deal.stage} /></td>
                      <td><Badge tone="neutral" mono>{humanise(b.stage)}</Badge></td>
                      <td className="num text-right text-[11.5px]">{money(b.ioiValue)}</td>
                      <td className="num text-right text-[11.5px]">{money(b.loiValue)}</td>
                      <td className="max-w-md text-[11px] text-stone">{b.strategicRationale ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    <div className="min-w-0">
      <div className="eyebrow mb-1">{label}</div>
      <div className="max-w-[220px] truncate text-[12.5px] text-ink">{value}</div>
    </div>
  );
}
