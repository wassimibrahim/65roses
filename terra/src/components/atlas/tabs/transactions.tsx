import Link from "next/link";
import type { InstitutionProfile } from "@/server/institution";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { StageChip } from "@/components/data/stage-chip";
import { Badge } from "@/components/ui/badge";
import { money, moneyRange, multiple, date, monthYear, percent } from "@/lib/format";
import { humanise } from "@/lib/utils";
import { compSetStats } from "@/lib/engine/valuation";

export function TransactionsTab({
  profile,
  comparables,
}: {
  profile: InstitutionProfile;
  comparables: {
    id: string; target: string; buyer: string; country: string; date: Date;
    segment: string; ev: number | null; revenue: number | null; ebitda: number | null;
    evRevenue: number | null; evEbitda: number | null; realEstateIncluded: boolean; notes: string | null;
  }[];
}) {
  const { record, scored } = profile;
  const stats = compSetStats(
    comparables.map((c) => ({
      target: c.target, buyer: c.buyer, country: c.country, date: c.date,
      segment: c.segment, evEbitda: c.evEbitda, evRevenue: c.evRevenue,
      realEstateIncluded: c.realEstateIncluded,
    })),
  );

  return (
    <div className="space-y-6">
      {record.dealAssets.length > 0 ? (
        <Panel>
          <PanelHeader title="Terra transactions involving this asset" />
          <ul>
            {record.dealAssets.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 border-b border-rule-soft px-4 py-3 last:border-b-0"
              >
                <Link href={`/deals/${a.deal.slug}`} className="text-[12.5px] text-ink hover:underline">
                  {a.deal.codeName}
                </Link>
                <StageChip stage={a.deal.stage} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {record.valuations.length > 0 ? (
        <Panel>
          <PanelHeader title="Valuation" meta="Ranges, not points" />
          <table className="grid-table">
            <thead>
              <tr>
                <th>Method</th>
                <th className="text-right">Low</th>
                <th className="text-right">High</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {record.valuations.map((v) => (
                <tr key={v.id}>
                  <td className="text-[12px] text-ink">{humanise(v.method)}</td>
                  <td className="num text-right text-[11.5px]">{money(v.low)}</td>
                  <td className="num text-right text-[11.5px]">{money(v.high)}</td>
                  <td className="max-w-md text-[11px] text-stone">{v.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PanelBody className="border-t border-rule-soft py-3">
            <Link
              href={`/underwriting/${record.slug}`}
              className="text-[11.5px] text-graphite underline-offset-4 hover:underline"
            >
              Open the underwriting model →
            </Link>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Relevant precedent transactions"
          meta={
            stats.evEbitda
              ? `${stats.count} deals · ${multiple(stats.evEbitda.low)}–${multiple(stats.evEbitda.high)} EV/EBITDA (median ${multiple(stats.evEbitda.median)})`
              : `${stats.count} deals`
          }
        />
        {comparables.length === 0 ? (
          <EmptyState title="No comparable transactions in this segment yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Buyer</th>
                  <th>Country</th>
                  <th>Date</th>
                  <th className="text-right">EV</th>
                  <th className="text-right">EV / Revenue</th>
                  <th className="text-right">EV / EBITDA</th>
                  <th>Real estate</th>
                </tr>
              </thead>
              <tbody>
                {comparables.map((c) => (
                  <tr key={c.id}>
                    <td className="text-[12px] text-ink">{c.target}</td>
                    <td className="text-[11.5px] text-graphite">{c.buyer}</td>
                    <td className="text-[11.5px] text-graphite">{c.country}</td>
                    <td className="num text-[11px] text-stone">{monthYear(c.date)}</td>
                    <td className="num text-right text-[11.5px]">{money(c.ev)}</td>
                    <td className="num text-right text-[11.5px]">{multiple(c.evRevenue)}</td>
                    <td className="num text-right text-[11.5px]">{multiple(c.evEbitda)}</td>
                    <td>
                      {c.realEstateIncluded ? (
                        <Badge tone="neutral" mono>Included</Badge>
                      ) : (
                        <Badge tone="quiet" mono>Excluded</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
