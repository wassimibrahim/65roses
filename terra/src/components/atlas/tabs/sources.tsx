import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { AssertionTag, ConfidenceMeter, StaleNotice } from "@/components/ui/provenance";
import { date, ageLabel } from "@/lib/format";
import { humanise } from "@/lib/utils";

type EvidenceRow = {
  id: string;
  field: string;
  value: string;
  assertion: string;
  confidence: string;
  lastReviewed: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  source: { name: string; url: string | null; kind: string | null } | null;
};

const FIELD_LABELS: Record<string, string> = {
  students: "Student count",
  foundedYear: "Year founded",
  tuitionAverage: "Average tuition",
  ownershipType: "Ownership type",
  revenue: "Revenue",
  tenure: "Campus tenure",
  founderAge: "Founder age",
  successionStatus: "Succession status",
};

/**
 * Data quality is more important than pretending everything is known. This tab
 * exists so that a partner can see exactly how much of a profile is load-bearing.
 */
export function SourcesTab({ evidence }: { evidence: EvidenceRow[] }) {
  if (evidence.length === 0) {
    return <EmptyState title="No provenance recorded for this institution." />;
  }

  const stale = evidence.filter(
    (e) => !e.lastReviewed || Date.now() - e.lastReviewed.getTime() > 365 * 86_400_000,
  );

  const counts = {
    FACT: evidence.filter((e) => e.assertion === "FACT").length,
    ESTIMATE: evidence.filter((e) => e.assertion === "ESTIMATE").length,
    SIGNAL: evidence.filter((e) => e.assertion === "SIGNAL").length,
    TERRA_HYPOTHESIS: evidence.filter((e) => e.assertion === "TERRA_HYPOTHESIS").length,
  };

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader title="What this profile rests on" />
        <PanelBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(Object.keys(counts) as (keyof typeof counts)[]).map((key) => (
              <div key={key}>
                <AssertionTag assertion={key} />
                <div className="num mt-1.5 text-[19px] text-ink">{counts[key]}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-[11.5px] leading-relaxed text-stone">
            A fact is something Terra can point at. An estimate is Terra&apos;s arithmetic. A signal
            is an observed event. A hypothesis is Terra&apos;s reading of one. These are never
            merged into a single confidence number.
          </p>
        </PanelBody>
      </Panel>

      {stale.length > 0 ? (
        <Panel>
          <PanelHeader title="Needs re-verification" meta={`${stale.length} fields`} />
          <PanelBody className="space-y-1.5">
            {stale.map((e) => (
              <StaleNotice
                key={e.id}
                field={FIELD_LABELS[e.field] ?? humanise(e.field)}
                lastVerified={e.lastReviewed}
                thresholdMonths={12}
              />
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title="Field-level provenance" meta={`${evidence.length} assertions`} />
        <div className="overflow-x-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th>Class</th>
                <th>Confidence</th>
                <th>Source</th>
                <th>Last reviewed</th>
                <th>Verified by</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((e) => (
                <tr key={e.id}>
                  <td className="text-[12px] text-ink">{FIELD_LABELS[e.field] ?? humanise(e.field)}</td>
                  <td className="num max-w-[180px] truncate text-[11.5px] text-graphite">{e.value}</td>
                  <td><AssertionTag assertion={e.assertion as never} /></td>
                  <td><ConfidenceMeter confidence={e.confidence as never} showLabel /></td>
                  <td className="text-[11.5px] text-graphite">{e.source?.name ?? "—"}</td>
                  <td className="num text-[11px] text-stone">{ageLabel(e.lastReviewed)}</td>
                  <td className="text-[11.5px] text-stone">{e.verifiedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
