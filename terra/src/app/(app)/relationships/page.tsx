import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import {
  loadContacts,
  graphAround,
  networkAdvantage,
  relationshipSummary,
} from "@/server/relationships";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { RelationshipNetwork } from "@/components/relationships/network";
import { StrengthMarks, ScoreBar } from "@/components/ui/score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/provenance";
import { relativeDays, percent, date as fmtDate } from "@/lib/format";
import { ACCESS_LABELS } from "@/lib/engine/graph";

export const metadata = { title: "Relationships" };
export const dynamic = "force-dynamic";

export default async function RelationshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; q?: string }>;
}) {
  await requireUser();
  const { focus, q } = await searchParams;

  const [contacts, view, advantage] = await Promise.all([
    loadContacts(),
    graphAround(focus ?? null, 2),
    networkAdvantage(),
  ]);

  const totals = relationshipSummary(contacts);
  const focusNode = view.nodes.find((n) => n.id === view.focusId);

  const query = q?.trim().toLowerCase();
  const external = contacts
    .filter((c) => !c.isInternal)
    .filter((c) =>
      query
        ? [c.name, c.title, c.organisation, c.location]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true,
    )
    .sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name));

  const goneQuiet = contacts
    .filter(
      (c) =>
        !c.isInternal &&
        c.strength >= 4 &&
        c.lastInteractionAt &&
        Date.now() - c.lastInteractionAt.getTime() > 45 * 86_400_000,
    )
    .sort((a, b) => (a.lastInteractionAt?.getTime() ?? 0) - (b.lastInteractionAt?.getTime() ?? 0));

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Relationships" }]}
        title="Relationships"
        subtitle={
          <>
            {totals.total} external contacts · {totals.trusted} trusted · {totals.warm} warm ·{" "}
            {percent(advantage.share.DIRECT + advantage.share.WARM_INTRODUCTION)} of the universe
            reachable warm or better
          </>
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href="/api/export/contacts">Export contacts</a>
          </Button>
        }
      />

      <div className="px-6 py-6 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel>
            <PanelHeader
              title="Network"
              meta={
                focusNode
                  ? `Two degrees around ${focusNode.label}`
                  : "Two degrees around Terra"
              }
              action={
                focus ? (
                  <Link href="/relationships" className="text-[11px] text-stone hover:text-ink">
                    Reset →
                  </Link>
                ) : null
              }
            />
            <RelationshipNetwork view={view} />
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Terra network advantage"
                meta={`${advantage.total} institutions`}
              />
              <PanelBody className="space-y-3">
                {(["DIRECT", "WARM_INTRODUCTION", "SECOND_DEGREE", "COLD"] as const).map((tier) => (
                  <div key={tier}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] text-ink">{ACCESS_LABELS[tier]}</span>
                      <span className="num text-[11px] text-stone">
                        {advantage.counts[tier]} · {percent(advantage.share[tier])}
                      </span>
                    </div>
                    <ScoreBar
                      value={advantage.share[tier] * 100}
                      className="mt-1"
                      tone={tier === "COLD" ? "burgundy" : tier === "DIRECT" ? "forest" : "ink"}
                    />
                  </div>
                ))}
                <p className="pt-1 text-[10.5px] leading-relaxed text-stone">
                  The share of the market Terra can reach without a cold approach. It is the
                  clearest single measure of the firm&apos;s proprietary advantage.
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Gone quiet" meta={`${goneQuiet.length}`} />
              {goneQuiet.length === 0 ? (
                <EmptyState title="Every strong relationship is current." />
              ) : (
                <ul>
                  {goneQuiet.slice(0, 8).map((c) => (
                    <li key={c.id} className="border-b border-rule-soft last:border-b-0">
                      <Link
                        href={`/relationships/${c.slug}`}
                        className="block px-4 py-2.5 transition-colors hover:bg-paper"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[12px] text-ink">{c.name}</span>
                          <span className="num text-[10.5px] text-burgundy">
                            {relativeDays(c.lastInteractionAt)}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-stone">
                          {[c.title, c.organisation].filter(Boolean).join(" · ")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <Panel className="mt-6">
          <PanelHeader title="Contacts" meta={`${external.length}`} />
          <div className="max-h-[520px] overflow-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Organisation</th>
                  <th>Location</th>
                  <th>Terra relationship</th>
                  <th>Owner</th>
                  <th className="text-right">Interactions</th>
                  <th className="text-right">Last contact</th>
                  <th>Follow-up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {external.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/relationships/${c.slug}`} className="text-[12.5px] text-ink hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="max-w-[170px] truncate text-[11.5px] text-graphite">{c.title ?? "—"}</td>
                    <td className="max-w-[170px] truncate text-[11.5px] text-graphite">
                      {c.organisationSlug ? (
                        <Link href={`/investors/${c.organisationSlug}`} className="hover:text-ink">
                          {c.organisation}
                        </Link>
                      ) : (
                        c.organisation ?? "—"
                      )}
                    </td>
                    <td className="text-[11.5px] text-graphite">{c.location ?? "—"}</td>
                    <td><StrengthMarks strength={c.strength} /></td>
                    <td className="text-[11.5px] text-graphite">{c.owner ?? "—"}</td>
                    <td className="num text-right text-[11.5px]">{c.interactionCount}</td>
                    <td className="num text-right text-[11px] text-stone">
                      {relativeDays(c.lastInteractionAt)}
                    </td>
                    <td className="num text-[11px] text-stone">
                      {c.nextFollowUpAt ? fmtDate(c.nextFollowUpAt) : "—"}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/relationships?focus=${c.id}`}
                        className="whitespace-nowrap text-[10.5px] text-stone hover:text-ink"
                      >
                        Graph →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <footer className="mt-10 flex items-center justify-between border-t border-rule-soft pt-4">
          <DemoNotice />
          <span className="text-[10.5px] text-stone">
            Professionally relevant information only.
          </span>
        </footer>
      </div>
    </>
  );
}
