/**
 * RELATIONSHIP GRAPH — "who can introduce us?"
 *
 * A weighted breadth-first search over people, organisations and institutions.
 * Path cost falls as relationship strength rises, so the engine prefers one
 * trusted hop over three weak ones.
 */

export type NodeKind = "person" | "organisation" | "institution";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel?: string | null;
  /** Terra's own people — every search starts from these. */
  internal?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: string;
  /** 1..5 */
  strength: number;
  note?: string | null;
}

export interface PathStep {
  node: GraphNode;
  viaEdge: GraphEdge | null;
}

export interface IntroductionPath {
  steps: PathStep[];
  /** Sum of hop costs — lower is better. */
  cost: number;
  /** Weakest link on the path, 1..5. This is what actually governs feasibility. */
  weakestLink: number;
  /** 1 = direct, 2 = second degree, and so on. */
  degree: number;
  /** How Terra would describe the route out loud. */
  narrative: string;
}

/** A trusted hop is nearly free; a cold hop is expensive. */
function hopCost(strength: number): number {
  const table: Record<number, number> = { 5: 1, 4: 1.6, 3: 3, 2: 6, 1: 14 };
  return table[Math.max(1, Math.min(5, Math.round(strength)))] ?? 14;
}

export class RelationshipGraph {
  private nodes = new Map<string, GraphNode>();
  private adjacency = new Map<string, GraphEdge[]>();

  constructor(nodes: GraphNode[] = [], edges: GraphEdge[] = []) {
    nodes.forEach((n) => this.addNode(n));
    edges.forEach((e) => this.addEdge(e));
  }

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, []);
  }

  /** Relationships are traversable in both directions — an introduction runs either way. */
  addEdge(edge: GraphEdge) {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) return;
    this.adjacency.get(edge.from)!.push(edge);
    this.adjacency.get(edge.to)!.push({ ...edge, from: edge.to, to: edge.from });
  }

  getNode(id: string) {
    return this.nodes.get(id);
  }

  allNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  neighbours(id: string): GraphEdge[] {
    return this.adjacency.get(id) ?? [];
  }

  /**
   * Cheapest routes from any starting node to a target. Returns distinct paths,
   * best first — Terra shows the route, not just the fact that one exists.
   */
  findPaths(
    startIds: string[],
    targetId: string,
    opts: { maxDegree?: number; limit?: number } = {},
  ): IntroductionPath[] {
    const maxDegree = opts.maxDegree ?? 4;
    const limit = opts.limit ?? 3;
    if (!this.nodes.has(targetId)) return [];

    interface Frontier {
      id: string;
      cost: number;
      steps: PathStep[];
      visited: Set<string>;
      weakest: number;
    }

    const results: IntroductionPath[] = [];
    const queue: Frontier[] = [];

    for (const startId of startIds) {
      const node = this.nodes.get(startId);
      if (!node) continue;
      queue.push({
        id: startId,
        cost: 0,
        steps: [{ node, viaEdge: null }],
        visited: new Set([startId]),
        weakest: 5,
      });
    }

    // Small graphs per query — a simple best-first sweep is fast enough and
    // keeps the code readable.
    let guard = 0;
    while (queue.length && guard < 20000) {
      guard++;
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;

      if (current.id === targetId && current.steps.length > 1) {
        results.push(this.toPath(current.steps, current.cost, current.weakest));
        if (results.length >= limit) break;
        continue;
      }

      if (current.steps.length > maxDegree) continue;

      for (const edge of this.neighbours(current.id)) {
        if (current.visited.has(edge.to)) continue;
        const node = this.nodes.get(edge.to);
        if (!node) continue;
        queue.push({
          id: edge.to,
          cost: current.cost + hopCost(edge.strength),
          steps: [...current.steps, { node, viaEdge: edge }],
          visited: new Set([...current.visited, edge.to]),
          weakest: Math.min(current.weakest, edge.strength),
        });
      }
    }

    return results;
  }

  private toPath(steps: PathStep[], cost: number, weakest: number): IntroductionPath {
    const degree = steps.length - 1;
    const narrative = steps.map((s) => s.node.label).join(" → ");
    return { steps, cost, weakestLink: weakest, degree, narrative };
  }
}

export type AccessTier = "DIRECT" | "WARM_INTRODUCTION" | "SECOND_DEGREE" | "COLD";

/**
 * Terra Network Advantage: how the firm actually reaches a target.
 * The distribution of this across the pipeline is a strategic metric (spec §29).
 */
export function classifyAccess(path: IntroductionPath | null | undefined): AccessTier {
  if (!path) return "COLD";
  if (path.degree <= 1 && path.weakestLink >= 4) return "DIRECT";
  if (path.degree <= 2 && path.weakestLink >= 4) return "WARM_INTRODUCTION";
  if (path.degree <= 3 && path.weakestLink >= 3) return "SECOND_DEGREE";
  return "COLD";
}

export const ACCESS_LABELS: Record<AccessTier, string> = {
  DIRECT: "Direct relationship",
  WARM_INTRODUCTION: "Warm introduction",
  SECOND_DEGREE: "Second-degree relationship",
  COLD: "Cold",
};
