import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/ui/panel";
import { Copilot } from "@/components/intelligence/copilot";
import { Badge } from "@/components/ui/badge";
import { AssertionTag, ConfidenceMeter, DemoNotice } from "@/components/ui/provenance";
import { date, relativeDays } from "@/lib/format";
import { humanise } from "@/lib/utils";

export const metadata = { title: "Intelligence" };
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "TRANSACTIONS",
  "OPERATORS",
  "INVESTORS",
  "REAL_ESTATE",
  "REGULATION",
  "MARKET_DATA",
  "EDUCATION_TRENDS",
] as const;

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireUser();
  const { category } = await searchParams;

  const [items, signals] = await Promise.all([
    db.intelligenceItem.findMany({
      where: category ? { category: category as never } : {},
      include: {
        source: { select: { name: true, url: true } },
        links: {
          include: {
            institution: { select: { slug: true, name: true } },
            organisation: { select: { slug: true, name: true } },
            person: { select: { slug: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    db.signal.findMany({
      orderBy: { date: "desc" },
      take: 20,
      include: {
        institution: { select: { slug: true, name: true, city: true } },
        source: { select: { name: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Terra", href: "/command" }, { label: "Intelligence" }]}
        title="Intelligence"
        subtitle="What changed in the market, and what Terra reads into it."
      />

      <div className="px-6 py-6 md:px-8">
        <Copilot />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="eyebrow mr-1">Category</span>
              <Link
                href="/intelligence"
                className={`rounded-sm border px-2 py-1 text-[11.5px] ${
                  !category ? "border-ink bg-ink text-ivory" : "border-rule bg-ivory text-graphite hover:bg-paper"
                }`}
              >
                All
              </Link>
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  href={`/intelligence?category=${c}`}
                  className={`rounded-sm border px-2 py-1 text-[11.5px] ${
                    category === c
                      ? "border-ink bg-ink text-ivory"
                      : "border-rule bg-ivory text-graphite hover:bg-paper"
                  }`}
                >
                  {humanise(c)}
                </Link>
              ))}
            </div>

            <Panel>
              <PanelHeader title="Market intelligence" meta={`${items.length} items`} />
              {items.length === 0 ? (
                <EmptyState title="Nothing in this category yet." />
              ) : (
                <ul>
                  {items.map((item) => (
                    <li key={item.id} id={item.id} className="border-b border-rule-soft px-4 py-4 last:border-b-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Badge tone="neutral" mono>{humanise(item.category)}</Badge>
                        <span className="num text-[10.5px] text-stone">
                          {date(item.date)} · {relativeDays(item.date)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-[14px] leading-snug text-ink">{item.title}</h3>
                      <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-graphite">
                        {item.summary}
                      </p>
                      {item.body ? (
                        <p className="mt-2 max-w-3xl text-[11.5px] leading-relaxed text-stone">
                          {item.body}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        {item.source ? (
                          <span className="text-[10.5px] text-stone-light">
                            Source: {item.source.name}
                          </span>
                        ) : null}
                        {item.links.map((link) => {
                          const target = link.institution
                            ? { label: link.institution.name, href: `/atlas/${link.institution.slug}` }
                            : link.organisation
                              ? { label: link.organisation.name, href: `/investors/${link.organisation.slug}` }
                              : link.person
                                ? {
                                    label: `${link.person.firstName} ${link.person.lastName}`,
                                    href: `/relationships/${link.person.slug}`,
                                  }
                                : null;
                          if (!target) return null;
                          return (
                            <Link
                              key={link.id}
                              href={target.href}
                              className="text-[11px] text-graphite underline-offset-4 hover:text-ink hover:underline"
                            >
                              {target.label}
                            </Link>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              title="Signal feed"
              meta="Observation and interpretation, never merged"
            />
            <ul className="max-h-[720px] overflow-y-auto">
              {signals.map((s) => (
                <li key={s.id} className="border-b border-rule-soft px-4 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={s.strength === "STRONG" ? "forest" : "quiet"} mono>
                      {humanise(s.type)}
                    </Badge>
                    <span className="num text-[10px] text-stone">{relativeDays(s.date)}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug text-ink">{s.headline}</p>
                  {s.institution ? (
                    <Link
                      href={`/atlas/${s.institution.slug}?tab=signals`}
                      className="mt-0.5 block text-[10.5px] text-stone hover:text-ink"
                    >
                      {s.institution.name}
                    </Link>
                  ) : null}
                  <div className="mt-1.5">
                    <ConfidenceMeter confidence={s.confidence} showLabel />
                  </div>
                  {s.interpretation ? (
                    <div className="mt-2 border-l-2 border-linen pl-2.5">
                      <AssertionTag assertion="TERRA_HYPOTHESIS" />
                      <p className="mt-1 text-[11px] leading-relaxed text-graphite">
                        {s.interpretation}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
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
