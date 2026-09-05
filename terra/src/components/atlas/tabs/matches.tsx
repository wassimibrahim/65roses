import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { MatchList } from "@/components/data/match-list";
import { DecisionSupportNote } from "@/components/ui/provenance";

export function MatchesTab({ profile }: { profile: InstitutionProfile }) {
  const { matches } = profile;

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Operating company — buyers and partners"
          meta={`${matches.opco.length} mandates`}
        />
        <MatchList matches={matches.opco} />
      </Panel>

      <Panel>
        <PanelHeader
          title="Campus — institutional property buyers"
          meta={`${matches.propco.length} mandates`}
        />
        <MatchList
          matches={matches.propco}
          emptyLabel="No property mandate fits — there may be no freehold to sell, or no landlord mandated in this geography."
        />
      </Panel>

      {matches.excluded.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Excluded"
            meta={`${matches.excluded.length} — shown with the reason, never hidden`}
          />
          <ul>
            {matches.excluded.map((m) => (
              <li
                key={m.mandateId}
                className="flex items-baseline justify-between gap-4 border-b border-rule-soft px-4 py-2.5 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="text-[12px] text-graphite">{m.organisationName}</span>
                  <span className="ml-2 text-[10.5px] text-stone">{m.mandateName}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-stone">
                  {m.issues[0] ?? "Outside mandate"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel>
        <PanelBody>
          <DecisionSupportNote />
        </PanelBody>
      </Panel>
    </div>
  );
}
