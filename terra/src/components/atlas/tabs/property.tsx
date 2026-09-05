import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { DefinitionGrid } from "@/components/data/definition-grid";
import { Badge } from "@/components/ui/badge";
import { AssertionTag } from "@/components/ui/provenance";
import { money, moneyRange, exact, percent, date } from "@/lib/format";
import { humanise } from "@/lib/utils";

/**
 * The OpCo / PropCo view. The whole point of this screen is that a school is
 * often two assets, and most people only see one of them.
 */
export function PropertyTab({ profile }: { profile: InstitutionProfile }) {
  const { record, scored } = profile;
  const property = record.properties[0];

  if (!property) {
    return <EmptyState title="No property record." hint="Add a campus to build the real-estate layer." />;
  }

  const owned = record.tenure === "OWNED" || record.tenure === "MIXED";
  const opcoEbitda = (scored.ebitda ?? 0) - (owned ? scored.marketRent : 0);

  return (
    <div className="space-y-6">
      {/* ── OpCo / PropCo split ──────────────────────────────────────────── */}
      <Panel>
        <PanelHeader
          title="Operating company and property company"
          meta={owned ? "Separable" : "Leasehold — nothing to separate"}
        />
        <PanelBody>
          <div className="grid gap-px bg-rule-soft md:grid-cols-[1fr_auto_1fr]">
            <div className="bg-ivory p-4">
              <div className="eyebrow mb-2">OpCo — the school</div>
              <p className="display text-[20px] text-ink">{record.name}</p>
              <dl className="mt-4 space-y-2">
                <SplitRow label="EBITDA before rent" value={money(scored.ebitda)} />
                {owned ? (
                  <SplitRow label="Market rent charged" value={`(${money(scored.marketRent)})`} />
                ) : null}
                <SplitRow label="EBITDA after rent" value={money(opcoEbitda)} emphasis />
                <SplitRow label="Students" value={exact(record.students)} />
                <SplitRow label="Buyers" value={`${profile.matches.opco.length} mandates fit`} />
              </dl>
            </div>

            <div className="flex items-center justify-center bg-ivory px-4 py-3 md:px-3">
              <div className="flex flex-col items-center gap-1 text-stone">
                <span className="h-px w-10 bg-rule md:h-16 md:w-px" />
                <span className="eyebrow whitespace-nowrap">
                  {owned ? "Lease" : "Third-party lease"}
                </span>
                <span className="h-px w-10 bg-rule md:h-16 md:w-px" />
              </div>
            </div>

            <div className="bg-ivory p-4">
              <div className="eyebrow mb-2">PropCo — the campus</div>
              <p className="display text-[20px] text-ink">{property.name}</p>
              <dl className="mt-4 space-y-2">
                <SplitRow label="Tenure" value={humanise(property.tenure)} />
                <SplitRow
                  label={owned ? "Estimated market rent" : "Passing rent"}
                  value={money(owned ? property.marketRentEstimate : property.annualRent)}
                />
                <SplitRow
                  label="Value"
                  value={
                    owned
                      ? moneyRange(property.valueEstimateLow, property.valueEstimateHigh)
                      : "Third-party owned"
                  }
                  emphasis={owned}
                />
                <SplitRow label="Owner" value={property.propertyOwner ?? "—"} />
                <SplitRow
                  label="Buyers"
                  value={owned ? `${profile.matches.propco.length} mandates fit` : "n/a"}
                />
              </dl>
            </div>
          </div>

          {owned ? (
            <p className="mt-4 flex flex-wrap items-baseline gap-2 text-[11.5px] leading-relaxed text-graphite">
              <AssertionTag assertion="ESTIMATE" />
              Rent is capitalised at an institutional net initial yield to estimate the freehold.
              A four-campus Iberian portfolio traded at 5.9% six months ago.
            </p>
          ) : null}
        </PanelBody>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Site" />
          <PanelBody>
            <DefinitionGrid
              columns={2}
              items={[
                { label: "Address", value: [property.city, property.country].filter(Boolean).join(", ") },
                { label: "Sites", value: String(property.siteCount), mono: true },
                { label: "Built area", value: property.builtAreaSqm ? `${exact(property.builtAreaSqm)} m²` : "—", mono: true },
                { label: "Plot", value: property.plotSizeSqm ? `${exact(property.plotSizeSqm)} m²` : "—", mono: true },
                { label: "Condition", value: property.condition ?? "—" },
                { label: "Maintenance capex", value: money(property.maintenanceCapex), mono: true },
                { label: "Adjacent land", value: property.adjacentLand ? "Available" : "None identified" },
                { label: "Zoning", value: property.zoningNotes ?? "—" },
              ]}
            />
            {property.expansionPotential ? (
              <p className="mt-4 border-t border-rule-soft pt-3 text-[11.5px] leading-relaxed text-graphite">
                <span className="eyebrow mr-1.5">Expansion</span>
                {property.expansionPotential}
              </p>
            ) : null}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Lease and rent" />
          <PanelBody>
            <DefinitionGrid
              columns={2}
              items={[
                { label: "Passing rent", value: money(property.annualRent), mono: true },
                { label: "Estimated market rent", value: money(property.marketRentEstimate), mono: true },
                { label: "Rent / revenue", value: percent(property.rentToRevenue, 1), mono: true },
                { label: "Rent / EBITDA", value: percent(property.rentToEbitda, 1), mono: true },
                { label: "Lease expiry", value: date(property.leaseExpiry), mono: true },
                {
                  label: "Remaining term",
                  value: property.leaseTermYears ? `${property.leaseTermYears} years` : "—",
                  mono: true,
                },
                { label: "Indexation", value: property.indexation ?? "—" },
                { label: "Landlord", value: property.propertyOwner ?? "—" },
              ]}
            />
          </PanelBody>
        </Panel>
      </div>

      {property.tags.length > 0 ? (
        <Panel>
          <PanelHeader title="Real-estate strategy" />
          <PanelBody className="flex flex-wrap gap-1.5">
            {property.tags.map((tag) => (
              <Badge key={tag} tone="gold" mono>
                {humanise(tag)}
              </Badge>
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      {record.campuses.length > 1 ? (
        <Panel>
          <PanelHeader title="Campuses" meta={`${record.campuses.length}`} />
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Campus</th>
                  <th>City</th>
                  <th className="text-right">Students</th>
                  <th className="text-right">Capacity</th>
                  <th>Tenure</th>
                </tr>
              </thead>
              <tbody>
                {record.campuses.map((c) => (
                  <tr key={c.id}>
                    <td className="text-[12px] text-ink">{c.name}</td>
                    <td className="text-[11.5px] text-graphite">{c.city}</td>
                    <td className="num text-right text-[11.5px]">{exact(c.students)}</td>
                    <td className="num text-right text-[11.5px]">{exact(c.capacity)}</td>
                    <td className="text-[11.5px] text-graphite">{humanise(c.tenure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function SplitRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${emphasis ? "border-t border-rule-soft pt-2" : ""}`}>
      <dt className={`text-[11.5px] ${emphasis ? "text-ink" : "text-stone"}`}>{label}</dt>
      <dd className={`num text-[12px] ${emphasis ? "text-ink" : "text-graphite"}`}>{value}</dd>
    </div>
  );
}
