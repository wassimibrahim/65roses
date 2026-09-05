"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { canSeeConfidential } from "@/lib/rbac";

export interface SearchHit {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  /** Right-aligned marker: a score, a stage, a value. */
  meta?: string;
}

const LIMIT_PER_GROUP = 6;

/**
 * Universal search. Runs server-side, filtered by role, and returns grouped
 * hits. Deliberately narrow queries — this has to feel instant.
 */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const contains = { contains: q, mode: "insensitive" as const };
  const confidential = canSeeConfidential(user.role);

  const [institutions, organisations, people, deals, properties, comparables, notes, intel] =
    await Promise.all([
      db.educationInstitution.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: contains }, { city: contains }, { familyName: contains }, { region: contains }],
        },
        select: { id: true, slug: true, name: true, city: true, country: true, type: true, students: true },
        take: LIMIT_PER_GROUP,
        orderBy: { name: "asc" },
      }),
      db.organisation.findMany({
        where: { deletedAt: null, OR: [{ name: contains }, { hq: contains }] },
        select: { id: true, slug: true, name: true, type: true, hq: true },
        take: LIMIT_PER_GROUP,
        orderBy: { name: "asc" },
      }),
      db.person.findMany({
        where: {
          deletedAt: null,
          OR: [{ firstName: contains }, { lastName: contains }, { title: contains }],
        },
        select: {
          id: true, slug: true, firstName: true, lastName: true, title: true,
          organisation: { select: { name: true } },
        },
        take: LIMIT_PER_GROUP,
        orderBy: { lastName: "asc" },
      }),
      db.deal.findMany({
        where: {
          deletedAt: null,
          ...(confidential ? {} : { restricted: false }),
          OR: [{ codeName: contains }, { clientLabel: contains }],
        },
        select: { id: true, slug: true, codeName: true, stage: true, clientLabel: true, expectedEv: true },
        take: LIMIT_PER_GROUP,
      }),
      db.property.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: contains }, { city: contains }, { propertyOwner: contains }],
        },
        select: {
          id: true, name: true, city: true, tenure: true,
          institution: { select: { slug: true, name: true } },
        },
        take: LIMIT_PER_GROUP,
      }),
      db.transactionComparable.findMany({
        where: { OR: [{ target: contains }, { buyer: contains }] },
        select: { id: true, target: true, buyer: true, country: true, evEbitda: true },
        take: LIMIT_PER_GROUP,
      }),
      db.note.findMany({
        where: { body: contains, ...(confidential ? {} : { partnerConfidential: false }) },
        select: {
          id: true, body: true,
          institution: { select: { slug: true, name: true } },
          deal: { select: { slug: true, codeName: true } },
        },
        take: 4,
      }),
      db.intelligenceItem.findMany({
        where: { OR: [{ title: contains }, { summary: contains }] },
        select: { id: true, title: true, category: true, date: true },
        take: 4,
      }),
    ]);

  const hits: SearchHit[] = [];

  for (const i of institutions) {
    hits.push({
      id: i.id,
      group: "Schools",
      title: i.name,
      subtitle: [i.city, i.country].filter(Boolean).join(", "),
      href: `/atlas/${i.slug}`,
      meta: i.students ? `${i.students} students` : undefined,
    });
  }
  for (const o of organisations) {
    hits.push({
      id: o.id,
      group: "Investors & operators",
      title: o.name,
      subtitle: o.hq ?? "",
      href: `/investors/${o.slug}`,
      meta: o.type.replace(/_/g, " ").toLowerCase(),
    });
  }
  for (const p of people) {
    hits.push({
      id: p.id,
      group: "People",
      title: `${p.firstName} ${p.lastName}`,
      subtitle: [p.title, p.organisation?.name].filter(Boolean).join(" · "),
      href: `/relationships/${p.slug}`,
    });
  }
  for (const d of deals) {
    hits.push({
      id: d.id,
      group: "Deals",
      title: d.codeName,
      subtitle: d.clientLabel ?? "",
      href: `/deals/${d.slug}`,
      meta: d.stage.replace(/_/g, " ").toLowerCase(),
    });
  }
  for (const p of properties) {
    hits.push({
      id: p.id,
      group: "Real estate",
      title: p.name,
      subtitle: [p.city, p.tenure.toLowerCase()].filter(Boolean).join(" · "),
      href: p.institution ? `/atlas/${p.institution.slug}?tab=property` : "/atlas",
    });
  }
  for (const c of comparables) {
    hits.push({
      id: c.id,
      group: "Precedent transactions",
      title: `${c.buyer} / ${c.target}`,
      subtitle: c.country,
      href: `/underwriting/comparables`,
      meta: c.evEbitda ? `${c.evEbitda}× EBITDA` : undefined,
    });
  }
  for (const n of notes) {
    hits.push({
      id: n.id,
      group: "Notes",
      title: n.body.slice(0, 70),
      subtitle: n.institution?.name ?? n.deal?.codeName ?? "",
      href: n.institution ? `/atlas/${n.institution.slug}` : n.deal ? `/deals/${n.deal.slug}` : "/command",
    });
  }
  for (const item of intel) {
    hits.push({
      id: item.id,
      group: "Intelligence",
      title: item.title,
      subtitle: item.category.replace(/_/g, " ").toLowerCase(),
      href: `/intelligence#${item.id}`,
    });
  }

  return hits;
}
