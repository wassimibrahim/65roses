import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { loadPerson } from "@/server/relationships";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { DefinitionGrid } from "@/components/data/definition-grid";
import { StrengthMarks } from "@/components/ui/score";
import { AccessChip } from "@/components/data/access-chip";
import { PathTrail } from "@/components/data/path-trail";
import { StageChip } from "@/components/data/stage-chip";
import { Badge } from "@/components/ui/badge";
import { DemoNotice } from "@/components/ui/provenance";
import { date, relativeDays, percent } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

const SENTIMENT_TONE: Record<string, "forest" | "neutral" | "burgundy" | "quiet"> = {
  POSITIVE: "forest",
  NEUTRAL: "quiet",
  CAUTIOUS: "neutral",
  NEGATIVE: "burgundy",
};

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const result = await loadPerson(slug, user);
  if (!result) notFound();
  const { person, access, interactions } = result;

  const terraEdges = person.relationshipsTo.filter((r) => r.fromPerson.isInternal);
  const bestStrength = terraEdges.reduce((max, r) => Math.max(max, r.strength), 0);
  const owner = terraEdges.find((r) => r.owner)?.owner?.name ?? null;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Terra", href: "/command" },
          { label: "Relationships", href: "/relationships" },
          { label: `${person.firstName} ${person.lastName}` },
        ]}
        title={`${person.firstName} ${person.lastName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {person.title ? <span>{person.title}</span> : null}
            {person.organisation ? (
              <>
                <span className="text-stone-light">·</span>
                <Link href={`/investors/${person.organisation.slug}`} className="hover:text-ink">
                  {person.organisation.name}
                </Link>
              </>
            ) : null}
            {person.location ? (
              <>
                <span className="text-stone-light">·</span>
                <span>{person.location}</span>
              </>
            ) : null}
          </span>
        }
        actions={
          person.isInternal ? <Badge tone="ink" mono>Terra</Badge> : <AccessChip tier={access.tier} />
        }
      />

      <div className="px-6 py-6 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Contact" />
              <PanelBody>
                <DefinitionGrid
                  columns={3}
                  items={[
                    { label: "Title", value: person.title ?? "—" },
                    { label: "Organisation", value: person.organisation?.name ?? "—" },
                    { label: "Location", value: person.location ?? "—" },
                    { label: "Email", value: person.email ?? "—" },
                    {
                      label: "LinkedIn",
                      value: person.linkedin ? (
                        <a
                          href={person.linkedin}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-quiet"
                        >
                          Profile
                        </a>
                      ) : (
                        "—"
                      ),
                    },
                    { label: "Languages", value: person.languages.join(" · ") || "—" },
                    {
                      label: "Professional interests",
                      value: person.professionalInterests.join(" · ") || "—",
                    },
                    { label: "Family", value: person.family?.name ? `${person.family.name} family` : "—" },
                    {
                      label: "Introduced by",
                      value: person.introducedBy ? (
                        <Link
                          href={`/relationships/${person.introducedBy.slug}`}
                          className="link-quiet"
                        >
                          {person.introducedBy.firstName} {person.introducedBy.lastName}
                        </Link>
                      ) : (
                        "—"
                      ),
                    },
                  ]}
                />
                {person.notes ? (
                  <p className="mt-4 max-w-3xl border-t border-rule-soft pt-3 text-[12.5px] leading-relaxed text-graphite">
                    {person.notes}
                  </p>
                ) : null}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Interaction timeline"
                meta="A new analyst should understand this relationship in three minutes"
              />
              {interactions.length === 0 ? (
                <EmptyState title="Nothing logged with this person." />
              ) : (
                <ol className="px-4 py-2">
                  {interactions.map((i) => (
                    <li key={i.id} className="relative border-l border-rule-soft py-3 pl-5">
                      <span className="absolute -left-[3px] top-[18px] size-[5px] rounded-full bg-linen" />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="eyebrow">{humanise(i.type)}</span>
                          <Badge tone={SENTIMENT_TONE[i.sentiment] ?? "quiet"} mono>
                            {humanise(i.sentiment)}
                          </Badge>
                        </span>
                        <span className="num text-[10px] text-stone">
                          {date(i.date)} · {relativeDays(i.date)}
                        </span>
                      </div>
                      <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink">{i.summary}</p>
                      <p className="mt-1 flex flex-wrap gap-x-2 text-[10.5px] text-stone">
                        <span>
                          {i.participants.map((p) => `${p.person.firstName} ${p.person.lastName}`).join(", ")}
                        </span>
                        {i.institution ? (
                          <Link href={`/atlas/${i.institution.slug}`} className="hover:text-ink">
                            · {i.institution.name}
                          </Link>
                        ) : null}
                        {i.deal ? (
                          <Link href={`/deals/${i.deal.slug}`} className="hover:text-ink">
                            · {i.deal.codeName}
                          </Link>
                        ) : null}
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
          </div>

          <div className="space-y-6">
            {!person.isInternal ? (
              <Panel>
                <PanelHeader title="How Terra reaches them" />
                <PanelBody className="space-y-3">
                  <AccessChip tier={access.tier} />
                  {access.best ? <PathTrail path={access.best} /> : (
                    <p className="text-[12px] text-stone">No route identified.</p>
                  )}
                  {bestStrength > 0 ? (
                    <div className="border-t border-rule-soft pt-3">
                      <div className="eyebrow mb-1.5">Strength</div>
                      <StrengthMarks strength={bestStrength} />
                      {owner ? (
                        <p className="mt-1.5 text-[10.5px] text-stone">Owner: {owner}</p>
                      ) : null}
                    </div>
                  ) : null}
                </PanelBody>
              </Panel>
            ) : null}

            {person.ownershipStakes.length > 0 ? (
              <Panel>
                <PanelHeader title="Ownership" />
                <ul>
                  {person.ownershipStakes.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-baseline justify-between gap-3 border-b border-rule-soft px-4 py-2.5 last:border-b-0"
                    >
                      {s.institution ? (
                        <Link href={`/atlas/${s.institution.slug}`} className="text-[12px] text-ink hover:underline">
                          {s.institution.name}
                        </Link>
                      ) : (
                        <span className="text-[12px] text-graphite">{s.holderName}</span>
                      )}
                      <span className="num text-[11.5px] text-graphite">{percent(s.percentage)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <Panel>
              <PanelHeader title="Known relationships" meta={`${person.relationshipsFrom.length + person.relationshipsTo.length}`} />
              {person.relationshipsFrom.length + person.relationshipsTo.length === 0 ? (
                <EmptyState title="No relationships mapped." />
              ) : (
                <ul>
                  {person.relationshipsFrom.map((r) => {
                    const target = r.toPerson
                      ? { label: `${r.toPerson.firstName} ${r.toPerson.lastName}`, href: `/relationships/${r.toPerson.slug}` }
                      : r.toOrganisation
                        ? { label: r.toOrganisation.name, href: `/investors/${r.toOrganisation.slug}` }
                        : r.toInstitution
                          ? { label: r.toInstitution.name, href: `/atlas/${r.toInstitution.slug}` }
                          : null;
                    if (!target) return null;
                    return (
                      <li key={r.id} className="border-b border-rule-soft px-4 py-2.5 last:border-b-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link href={target.href} className="text-[12px] text-ink hover:underline">
                            {target.label}
                          </Link>
                          <Badge tone="quiet" mono>{humanise(r.kind)}</Badge>
                        </div>
                        <div className="mt-1"><StrengthMarks strength={r.strength} /></div>
                      </li>
                    );
                  })}
                  {person.relationshipsTo.map((r) => (
                    <li key={r.id} className="border-b border-rule-soft px-4 py-2.5 last:border-b-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/relationships/${r.fromPerson.slug}`}
                          className="text-[12px] text-ink hover:underline"
                        >
                          {r.fromPerson.firstName} {r.fromPerson.lastName}
                        </Link>
                        <Badge tone={r.fromPerson.isInternal ? "ink" : "quiet"} mono>
                          {r.fromPerson.isInternal ? "Terra" : humanise(r.kind)}
                        </Badge>
                      </div>
                      <div className="mt-1"><StrengthMarks strength={r.strength} /></div>
                      {r.notes ? (
                        <p className="mt-1 text-[10.5px] leading-relaxed text-graphite">{r.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {person.dealParticipants.length > 0 ? (
              <Panel>
                <PanelHeader title="Processes" />
                <ul>
                  {person.dealParticipants.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 border-b border-rule-soft px-4 py-2.5 last:border-b-0"
                    >
                      <Link href={`/deals/${p.deal.slug}`} className="text-[12px] text-ink hover:underline">
                        {p.deal.codeName}
                      </Link>
                      <StageChip stage={p.deal.stage} />
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            {person.family && person.family.members.length > 1 ? (
              <Panel>
                <PanelHeader title={`${person.family.name} family`} />
                <ul>
                  {person.family.members
                    .filter((m) => m.id !== person.id)
                    .map((m) => (
                      <li key={m.id} className="border-b border-rule-soft px-4 py-2.5 last:border-b-0">
                        <Link href={`/relationships/${m.slug}`} className="text-[12px] text-ink hover:underline">
                          {m.firstName} {m.lastName}
                        </Link>
                        <p className="text-[10.5px] text-stone">{m.title ?? "—"}</p>
                      </li>
                    ))}
                </ul>
              </Panel>
            ) : null}
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
