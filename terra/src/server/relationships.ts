import "server-only";
import { db } from "@/lib/db";
import { loadGraph, assessAccess } from "@/server/graph";
import { classifyAccess, type AccessTier } from "@/lib/engine/graph";
import { canSeeConfidential, type SessionUser } from "@/lib/rbac";

export interface ContactRow {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  organisation: string | null;
  organisationSlug: string | null;
  location: string | null;
  languages: string[];
  isInternal: boolean;
  strength: number;
  owner: string | null;
  lastInteractionAt: Date | null;
  nextFollowUpAt: Date | null;
  interactionCount: number;
}

export async function loadContacts(): Promise<ContactRow[]> {
  const people = await db.person.findMany({
    where: { deletedAt: null },
    include: {
      organisation: { select: { name: true, slug: true } },
      relationshipsTo: {
        where: { fromPerson: { isInternal: true } },
        select: { strength: true, lastInteractionAt: true, nextFollowUpAt: true, owner: { select: { name: true } } },
      },
      _count: { select: { interactions: true } },
    },
    orderBy: { lastName: "asc" },
  });

  return people.map((p) => {
    // Terra's relationship with a person is the strongest edge any of its own
    // people hold to them.
    const best = p.relationshipsTo.reduce(
      (acc, r) => (r.strength > (acc?.strength ?? 0) ? r : acc),
      p.relationshipsTo[0],
    );
    const lastInteractionAt = p.relationshipsTo
      .map((r) => r.lastInteractionAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      id: p.id,
      slug: p.slug,
      name: `${p.firstName} ${p.lastName}`,
      title: p.title,
      organisation: p.organisation?.name ?? null,
      organisationSlug: p.organisation?.slug ?? null,
      location: p.location,
      languages: p.languages,
      isInternal: p.isInternal,
      strength: best?.strength ?? (p.isInternal ? 5 : 1),
      owner: best?.owner?.name ?? null,
      lastInteractionAt,
      nextFollowUpAt: best?.nextFollowUpAt ?? null,
      interactionCount: p._count.interactions,
    };
  });
}

export async function loadPerson(slug: string, user: SessionUser) {
  const confidential = canSeeConfidential(user.role);
  const person = await db.person.findFirst({
    where: { slug, deletedAt: null },
    include: {
      organisation: { select: { id: true, slug: true, name: true, type: true } },
      family: { select: { id: true, name: true, members: { select: { id: true, slug: true, firstName: true, lastName: true, title: true } } } },
      introducedBy: { select: { slug: true, firstName: true, lastName: true } },
      introduced: { select: { slug: true, firstName: true, lastName: true } },
      ownershipStakes: {
        include: { institution: { select: { slug: true, name: true, city: true } } },
      },
      relationshipsFrom: {
        where: confidential ? {} : { partnerConfidential: false },
        include: {
          toPerson: { select: { slug: true, firstName: true, lastName: true, title: true } },
          toOrganisation: { select: { slug: true, name: true, type: true } },
          toInstitution: { select: { slug: true, name: true, city: true } },
          owner: { select: { name: true } },
        },
      },
      relationshipsTo: {
        where: confidential ? {} : { partnerConfidential: false },
        include: {
          fromPerson: {
            select: { slug: true, firstName: true, lastName: true, title: true, isInternal: true },
          },
          owner: { select: { name: true } },
        },
      },
      interactions: {
        include: {
          interaction: {
            include: {
              loggedBy: { select: { name: true } },
              institution: { select: { slug: true, name: true } },
              organisation: { select: { slug: true, name: true } },
              deal: { select: { slug: true, codeName: true } },
              participants: {
                include: { person: { select: { slug: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
      dealParticipants: {
        include: { deal: { select: { slug: true, codeName: true, stage: true } } },
      },
    },
  });
  if (!person) return null;

  const access = await assessAccess(person.id);
  const interactions = person.interactions
    .map((i) => i.interaction)
    .filter((i) => confidential || !i.partnerConfidential)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return { person, access, interactions };
}

export interface GraphView {
  nodes: {
    id: string;
    kind: string;
    label: string;
    sublabel: string | null;
    internal: boolean;
    degree: number;
  }[];
  edges: { from: string; to: string; kind: string; strength: number }[];
  focusId: string | null;
}

/**
 * A bounded slice of the graph around a focus node. Loading the whole network
 * would be both slow and unreadable.
 */
export async function graphAround(focusId: string | null, maxDegree = 2): Promise<GraphView> {
  const { graph, terraNodeIds } = await loadGraph();
  const start = focusId ?? terraNodeIds[0] ?? null;
  if (!start || !graph.getNode(start)) {
    return { nodes: [], edges: [], focusId: null };
  }

  const degrees = new Map<string, number>([[start, 0]]);
  let frontier = [start];
  for (let d = 1; d <= maxDegree; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.neighbours(id)) {
        if (!degrees.has(edge.to)) {
          degrees.set(edge.to, d);
          next.push(edge.to);
        }
      }
    }
    frontier = next;
  }

  const included = new Set(degrees.keys());
  const nodes = [...included]
    .map((id) => {
      const node = graph.getNode(id)!;
      return {
        id: node.id,
        kind: node.kind,
        label: node.label,
        sublabel: node.sublabel ?? null,
        internal: node.internal ?? false,
        degree: degrees.get(id) ?? 0,
      };
    })
    .sort((a, b) => a.degree - b.degree || a.label.localeCompare(b.label));

  const seen = new Set<string>();
  const edges: GraphView["edges"] = [];
  for (const id of included) {
    for (const edge of graph.neighbours(id)) {
      if (!included.has(edge.to)) continue;
      const key = [edge.from, edge.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: edge.from, to: edge.to, kind: edge.kind, strength: edge.strength });
    }
  }

  return { nodes, edges, focusId: start };
}

/** Terra Network Advantage — the access mix across the target universe. */
export async function networkAdvantage() {
  const { graph, terraNodeIds } = await loadGraph();
  const institutions = graph.allNodes().filter((n) => n.kind === "institution");

  const counts: Record<AccessTier, number> = {
    DIRECT: 0,
    WARM_INTRODUCTION: 0,
    SECOND_DEGREE: 0,
    COLD: 0,
  };

  for (const node of institutions) {
    const path = graph.findPaths(terraNodeIds, node.id, { maxDegree: 4, limit: 1 })[0] ?? null;
    counts[classifyAccess(path)] += 1;
  }

  const total = institutions.length || 1;
  return {
    counts,
    total: institutions.length,
    share: {
      DIRECT: counts.DIRECT / total,
      WARM_INTRODUCTION: counts.WARM_INTRODUCTION / total,
      SECOND_DEGREE: counts.SECOND_DEGREE / total,
      COLD: counts.COLD / total,
    },
  };
}

export function relationshipSummary(rows: ContactRow[]) {
  const external = rows.filter((r) => !r.isInternal);
  const cold = external.filter(
    (r) => r.strength >= 4 && r.lastInteractionAt && Date.now() - r.lastInteractionAt.getTime() > 60 * 86_400_000,
  );
  return {
    total: external.length,
    trusted: external.filter((r) => r.strength === 5).length,
    warm: external.filter((r) => r.strength === 4).length,
    goneQuiet: cold.length,
    unowned: external.filter((r) => r.strength >= 3 && !r.owner).length,
  };
}
