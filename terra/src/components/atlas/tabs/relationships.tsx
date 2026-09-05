import Link from "next/link";
import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { StrengthMarks } from "@/components/ui/score";
import { AccessChip } from "@/components/data/access-chip";
import { Badge } from "@/components/ui/badge";
import { date, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { PathTrail } from "@/components/data/path-trail";

export function RelationshipsTab({ profile }: { profile: InstitutionProfile }) {
  const { record, access } = profile;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="How Terra gets into the room" />
          <PanelBody className="space-y-4">
            <AccessChip tier={access.tier} />
            {access.best ? (
              <PathTrail path={access.best} />
            ) : (
              <p className="text-[12px] leading-relaxed text-stone">
                No route identified. Advisers, landlords and peer founders are the usual way in.
              </p>
            )}
            {access.alternatives.map((path, i) => (
              <div key={i} className="border-t border-rule-soft pt-3">
                <div className="eyebrow mb-2">Alternative route</div>
                <PathTrail path={path} />
              </div>
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="People connected to this institution" meta={`${record.relationships.length}`} />
          {record.relationships.length === 0 ? (
            <EmptyState title="No connections mapped yet." />
          ) : (
            <ul>
              {record.relationships.map((r) => (
                <li key={r.id} className="border-b border-rule-soft px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/relationships/${r.fromPerson.slug}`}
                        className="text-[12.5px] text-ink hover:underline"
                      >
                        {r.fromPerson.firstName} {r.fromPerson.lastName}
                      </Link>
                      <p className="text-[10.5px] text-stone">
                        {[r.fromPerson.title, r.fromPerson.organisation?.name].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge tone="quiet" mono>{humanise(r.kind)}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <StrengthMarks strength={r.strength} />
                    {r.lastInteractionAt ? (
                      <span className="text-[10.5px] text-stone">
                        Last contact {relativeDays(r.lastInteractionAt)}
                      </span>
                    ) : null}
                    {r.owner ? (
                      <span className="text-[10.5px] text-stone">Owner: {r.owner.name}</span>
                    ) : null}
                  </div>
                  {r.notes ? (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-graphite">{r.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Interaction timeline"
          meta="Institutional memory"
          action={
            <span className="text-[10.5px] text-stone">
              {record.interactions.length} logged
            </span>
          }
        />
        {record.interactions.length === 0 ? (
          <EmptyState
            title="No interactions logged."
            hint="A new analyst should be able to understand this relationship in three minutes."
          />
        ) : (
          <ol className="px-4 py-2">
            {record.interactions.map((i) => (
              <li key={i.id} className="relative border-l border-rule-soft py-3 pl-5">
                <span className="absolute -left-[3px] top-[18px] size-[5px] rounded-full bg-linen" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="eyebrow">{humanise(i.type)}</span>
                  <span className="num text-[10px] text-stone">{date(i.date)}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink">{i.summary}</p>
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
    </div>
  );
}
