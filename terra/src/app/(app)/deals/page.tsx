import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { loadDeals, dealSummary } from "@/server/deals";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, EmptyState } from "@/components/ui/panel";
import { StageChip } from "@/components/data/stage-chip";
import { ScoreBar } from "@/components/ui/score";
import { DemoNotice } from "@/components/ui/provenance";
import { money, percent, date as fmtDate, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const metadata = { title: "Deals" };
export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const user = await requireUser();
  const deals = await loadDeals(user);
  const totals = dealSummary(deals);
  const live = deals.filter((d) => !["CLOSED", "LOST"].includes(d.stage));
  const closed = deals.filter((d) => ["CLOSED", "LOST"].includes(d.stage));

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Deals" }]}
        title="Deals"
        subtitle={
          <>
            {totals.live} live mandates · {money(totals.ev)} enterprise value ·{" "}
            {money(totals.weightedFees)} probability-weighted fees
          </>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <section className="mb-6 grid grid-cols-2 gap-px border border-rule-soft bg-rule-soft sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Live mandates" value={String(totals.live)} />
          <Stat label="Enterprise value" value={money(totals.ev)} />
          <Stat label="Gross fees" value={money(totals.fees)} />
          <Stat label="Weighted fees" value={money(totals.weightedFees)} />
          <Stat label="Closed" value={String(totals.closed)} />
          <Stat
            label="Blocked"
            value={String(totals.blocked)}
            tone={totals.blocked > 0 ? "burgundy" : undefined}
          />
        </section>

        <Panel>
          <PanelHeader title="Live processes" meta={`${live.length}`} />
          {live.length === 0 ? (
            <EmptyState title="No live mandate." />
          ) : (
            <ul>
              {live.map((deal) => (
                <li key={deal.id} className="border-b border-rule-soft px-4 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <Link
                          href={`/deals/${deal.slug}`}
                          className="display text-[17px] text-ink hover:underline"
                        >
                          {deal.codeName}
                        </Link>
                        <StageChip stage={deal.stage} />
                        <span className="text-[11px] text-stone">
                          {humanise(deal.transactionType)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[11.5px] text-stone">
                        {deal.clientLabel ?? deal.clientOrg?.name ?? "—"}
                        {deal.assets[0]?.institution ? (
                          <>
                            {" · "}
                            <Link
                              href={`/atlas/${deal.assets[0].institution.slug}`}
                              className="hover:text-ink"
                            >
                              {deal.assets[0].institution.name}
                            </Link>
                          </>
                        ) : null}
                      </p>

                      {deal.keyBlocker ? (
                        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-burgundy">
                          <AlertTriangle className="mt-px size-3 shrink-0" />
                          {deal.keyBlocker}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px] text-stone">
                        <span>
                          Lead <span className="text-graphite">{deal.leadPartner?.name ?? "—"}</span>
                        </span>
                        <span>
                          Analyst <span className="text-graphite">{deal.analyst?.name ?? "—"}</span>
                        </span>
                        <span>
                          Target close{" "}
                          <span className="num text-graphite">{fmtDate(deal.targetClose)}</span>
                        </span>
                        <span>
                          Last touch{" "}
                          <span
                            className={
                              deal.lastInteractionAt &&
                              Date.now() - deal.lastInteractionAt.getTime() > 21 * 86_400_000
                                ? "text-burgundy"
                                : "text-graphite"
                            }
                          >
                            {relativeDays(deal.lastInteractionAt)}
                          </span>
                        </span>
                        <span>
                          Buyers{" "}
                          <span className="num text-graphite">
                            {deal.buyersEngaged}/{deal.buyersTotal} engaged
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-8">
                      <Figure label="Enterprise value" value={money(deal.expectedEv)} />
                      <Figure label="Fee" value={money(deal.expectedFee)} />
                      <Figure label="Probability" value={percent(deal.probability)} />
                      <div className="w-24">
                        <div className="eyebrow mb-1">Process</div>
                        <div className="num text-[12.5px] text-ink">
                          {Math.round(deal.progress * 100)}%
                        </div>
                        <ScoreBar value={deal.progress * 100} className="mt-1.5" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {closed.length > 0 ? (
          <Panel className="mt-6">
            <PanelHeader title="Completed" meta={`${closed.length}`} />
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Outcome</th>
                  <th className="text-right">EV</th>
                  <th className="text-right">Fee</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link href={`/deals/${deal.slug}`} className="text-[12.5px] text-ink hover:underline">
                        {deal.codeName}
                      </Link>
                    </td>
                    <td className="text-[11.5px] text-graphite">{deal.clientLabel ?? "—"}</td>
                    <td className="text-[11.5px] text-graphite">{humanise(deal.transactionType)}</td>
                    <td><StageChip stage={deal.stage} /></td>
                    <td className="num text-right text-[11.5px]">{money(deal.expectedEv)}</td>
                    <td className="num text-right text-[11.5px]">{money(deal.expectedFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="num text-[12.5px] text-ink">{value}</div>
    </div>
  );
}
