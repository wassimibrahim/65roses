import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  RelationshipGraph,
  classifyAccess,
  type GraphEdge,
  type GraphNode,
  type IntroductionPath,
  type AccessTier,
} from "@/lib/engine/graph";

/**
 * Builds the relationship graph once per request. It is small enough to hold
 * in memory (hundreds of nodes) and every access question in the product is
 * answered from it.
 */
export const loadGraph = cache(async (): Promise<{
  graph: RelationshipGraph;
  terraNodeIds: string[];
}> => {
  const [people, organisations, institutions, relationships] = await Promise.all([
    db.person.findMany({
      where: { deletedAt: null },
      select: {
        id: true, firstName: true, lastName: true, title: true, isInternal: true,
        organisation: { select: { name: true } },
      },
    }),
    db.organisation.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, type: true },
    }),
    db.educationInstitution.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, city: true },
    }),
    db.relationship.findMany({
      select: {
        fromPersonId: true, toPersonId: true, toOrganisationId: true,
        toInstitutionId: true, kind: true, strength: true, notes: true,
      },
    }),
  ]);

  const nodes: GraphNode[] = [
    ...people.map((p) => ({
      id: p.id,
      kind: "person" as const,
      label: `${p.firstName} ${p.lastName}`,
      sublabel: [p.title, p.organisation?.name].filter(Boolean).join(" · ") || null,
      internal: p.isInternal,
    })),
    ...organisations.map((o) => ({
      id: o.id,
      kind: "organisation" as const,
      label: o.name,
      sublabel: o.type.replace(/_/g, " ").toLowerCase(),
    })),
    ...institutions.map((i) => ({
      id: i.id,
      kind: "institution" as const,
      label: i.name,
      sublabel: i.city,
    })),
  ];

  const edges: GraphEdge[] = relationships.flatMap((r) => {
    const to = r.toPersonId ?? r.toOrganisationId ?? r.toInstitutionId;
    if (!to) return [];
    return [
      {
        from: r.fromPersonId,
        to,
        kind: r.kind as string,
        strength: r.strength,
        note: r.notes,
      },
    ];
  });

  return {
    graph: new RelationshipGraph(nodes, edges),
    terraNodeIds: people.filter((p) => p.isInternal).map((p) => p.id),
  };
});

export interface AccessAssessment {
  tier: AccessTier;
  best: IntroductionPath | null;
  alternatives: IntroductionPath[];
  /** Strength of the best route, 1..5. Drives the relationship subscore. */
  strength: number;
}

export async function assessAccess(targetId: string): Promise<AccessAssessment> {
  const { graph, terraNodeIds } = await loadGraph();
  const paths = graph.findPaths(terraNodeIds, targetId, { maxDegree: 4, limit: 3 });
  const best = paths[0] ?? null;
  return {
    tier: classifyAccess(best),
    best,
    alternatives: paths.slice(1),
    strength: best ? best.weakestLink : 1,
  };
}

/** Batch version — one graph build, one sweep, used by Command and Atlas. */
export async function assessAccessMany(
  targetIds: string[],
): Promise<Map<string, AccessAssessment>> {
  const { graph, terraNodeIds } = await loadGraph();
  const result = new Map<string, AccessAssessment>();
  for (const id of targetIds) {
    const paths = graph.findPaths(terraNodeIds, id, { maxDegree: 4, limit: 2 });
    const best = paths[0] ?? null;
    result.set(id, {
      tier: classifyAccess(best),
      best,
      alternatives: paths.slice(1),
      strength: best ? best.weakestLink : 1,
    });
  }
  return result;
}
