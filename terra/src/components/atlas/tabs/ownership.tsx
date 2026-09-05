import Link from "next/link";
import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { ConfidenceMeter, AssertionTag } from "@/components/ui/provenance";
import { Badge } from "@/components/ui/badge";
import { percent, date } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { OBJECTIVE_LABELS } from "@/lib/engine/legacy";

export function OwnershipTab({ profile }: { profile: InstitutionProfile }) {
  const { record } = profile;
  const current = record.ownershipStakes.filter((s) => s.to === null);
  const historical = record.ownershipStakes.filter((s) => s.to !== null);
  const founder = record.founderProfile;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="Current ownership" />
          {current.length === 0 ? (
            <EmptyState title="Ownership not yet established." />
          ) : (
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Holder</th>
                  <th>Role</th>
                  <th className="text-right">Stake</th>
                  <th>Since</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {current.map((stake) => (
                  <tr key={stake.id}>
                    <td className="text-[12.5px] text-ink">{stake.holderName ?? "—"}</td>
                    <td className="text-[11.5px] text-graphite">{stake.role ?? "—"}</td>
                    <td className="num text-right text-[11.5px]">{percent(stake.percentage)}</td>
                    <td className="num text-[11.5px] text-graphite">{date(stake.from)}</td>
                    <td><ConfidenceMeter confidence={stake.confidence} showLabel /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {historical.length > 0 ? (
          <Panel>
            <PanelHeader title="Historical ownership" meta="Preserved, never overwritten" />
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Holder</th>
                  <th>Role</th>
                  <th className="text-right">Stake</th>
                  <th>From</th>
                  <th>Until</th>
                </tr>
              </thead>
              <tbody>
                {historical.map((stake) => (
                  <tr key={stake.id}>
                    <td className="text-[12.5px] text-graphite">{stake.holderName ?? "—"}</td>
                    <td className="text-[11.5px] text-stone">{stake.role ?? "—"}</td>
                    <td className="num text-right text-[11.5px]">{percent(stake.percentage)}</td>
                    <td className="num text-[11.5px] text-stone">{date(stake.from)}</td>
                    <td className="num text-[11.5px] text-stone">{date(stake.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ) : null}

        {record.organisation ? (
          <Panel>
            <PanelHeader title="Owning organisation" />
            <PanelBody>
              <Link
                href={`/investors/${record.organisation.slug}`}
                className="text-[13px] text-ink hover:underline"
              >
                {record.organisation.name}
              </Link>
              <p className="mt-0.5 text-[11px] text-stone">{humanise(record.organisation.type)}</p>
            </PanelBody>
          </Panel>
        ) : null}
      </div>

      <div className="space-y-6">
        <Panel>
          <PanelHeader title="Succession" action={<AssertionTag assertion="TERRA_HYPOTHESIS" />} />
          <PanelBody className="space-y-3">
            <p className="display text-[19px] text-ink">{humanise(record.successionStatus)}</p>
            <dl className="space-y-1.5">
              <Row label="Generation" value={humanise(record.generation)} />
              <Row label="Founder age" value={record.founderAge ? String(record.founderAge) : "Not known"} />
              <Row label="Family" value={record.familyName ? `${record.familyName} family` : "—"} />
            </dl>
            <p className="text-[11px] leading-relaxed text-stone">
              Succession status is Terra's reading of public information and conversations. It is
              not a statement made by the family.
            </p>
          </PanelBody>
        </Panel>

        {founder ? (
          <Panel>
            <PanelHeader
              title="Founder legacy profile"
              meta={founder.founderPerson ? `${founder.founderPerson.firstName} ${founder.founderPerson.lastName}` : undefined}
            />
            <PanelBody className="space-y-4">
              {founder.narrative ? (
                <p className="text-[12.5px] leading-relaxed text-graphite">{founder.narrative}</p>
              ) : null}
              <div>
                <div className="eyebrow mb-2">Objectives, in the founder&apos;s order</div>
                <ol className="space-y-1.5">
                  {founder.objectives.map((o) => (
                    <li key={o.id} className="flex items-baseline gap-2.5">
                      <span className="num w-4 shrink-0 text-[10px] text-stone-light">
                        {String(o.rank).padStart(2, "0")}
                      </span>
                      <span className="text-[12px] text-ink">
                        {OBJECTIVE_LABELS[o.objective as keyof typeof OBJECTIVE_LABELS]}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <Link
                href={`/atlas/${record.slug}/structures`}
                className="inline-block text-[11.5px] text-graphite underline-offset-4 hover:underline"
              >
                Evaluate structures against these objectives →
              </Link>
            </PanelBody>
          </Panel>
        ) : (
          <Panel>
            <PanelHeader title="Founder legacy profile" />
            <EmptyState
              title="No founder objectives recorded."
              hint="Founder-owned schools are rarely decided on price alone. Capturing what the founder actually wants is what turns a valuation into advice."
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11.5px] text-stone">{label}</dt>
      <dd className="text-[12px] text-graphite">{value}</dd>
    </div>
  );
}
