import { describe, it, expect } from "vitest";
import {
  RelationshipGraph,
  classifyAccess,
  type GraphEdge,
  type GraphNode,
} from "@/lib/engine/graph";

const nodes: GraphNode[] = [
  { id: "fouad", kind: "person", label: "Fouad", internal: true },
  { id: "lawyer", kind: "person", label: "Elena Vidal", sublabel: "Corporate lawyer" },
  { id: "founder", kind: "person", label: "Ignacio Serra", sublabel: "Founder" },
  { id: "school", kind: "institution", label: "Colegio Monteverde" },
  { id: "stranger", kind: "person", label: "Unknown Contact" },
  { id: "island", kind: "institution", label: "Unconnected School" },
];

const edges: GraphEdge[] = [
  { from: "fouad", to: "lawyer", kind: "KNOWS", strength: 5 },
  { from: "lawyer", to: "founder", kind: "ADVISES", strength: 4 },
  { from: "founder", to: "school", kind: "OWNS", strength: 5 },
  { from: "fouad", to: "stranger", kind: "KNOWS", strength: 1 },
  { from: "stranger", to: "school", kind: "KNOWS", strength: 1 },
];

const graph = new RelationshipGraph(nodes, edges);

describe("relationship graph", () => {
  it("finds a route from Terra to a target institution", () => {
    const paths = graph.findPaths(["fouad"], "school");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]!.narrative).toBe("Fouad → Elena Vidal → Ignacio Serra → Colegio Monteverde");
  });

  it("prefers strong hops over a shorter weak route", () => {
    const paths = graph.findPaths(["fouad"], "school");
    // The two-hop route through a stranger is shorter but far weaker.
    expect(paths[0]!.weakestLink).toBeGreaterThanOrEqual(4);
    expect(paths[0]!.steps.length).toBeGreaterThan(2);
  });

  it("traverses relationships in both directions", () => {
    const paths = graph.findPaths(["school"], "fouad");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]!.steps[0]!.node.id).toBe("school");
  });

  it("returns nothing for an unreachable node", () => {
    expect(graph.findPaths(["fouad"], "island")).toHaveLength(0);
  });

  it("returns nothing for an unknown node", () => {
    expect(graph.findPaths(["fouad"], "does-not-exist")).toHaveLength(0);
  });

  it("respects the maximum degree", () => {
    const paths = graph.findPaths(["fouad"], "school", { maxDegree: 2 });
    for (const p of paths) {
      expect(p.degree).toBeLessThanOrEqual(2);
    }
  });

  it("classifies access tiers from the path", () => {
    expect(classifyAccess(null)).toBe("COLD");
    const direct = graph.findPaths(["fouad"], "lawyer")[0]!;
    expect(classifyAccess(direct)).toBe("DIRECT");
    const warm = graph.findPaths(["fouad"], "founder")[0]!;
    expect(classifyAccess(warm)).toBe("WARM_INTRODUCTION");
    const second = graph.findPaths(["fouad"], "school")[0]!;
    expect(classifyAccess(second)).toBe("SECOND_DEGREE");
  });

  it("treats a weak-only route as cold", () => {
    const weakGraph = new RelationshipGraph(
      [nodes[0]!, nodes[4]!, nodes[3]!],
      [
        { from: "fouad", to: "stranger", kind: "KNOWS", strength: 1 },
        { from: "stranger", to: "school", kind: "KNOWS", strength: 1 },
      ],
    );
    const path = weakGraph.findPaths(["fouad"], "school")[0]!;
    expect(classifyAccess(path)).toBe("COLD");
  });

  it("ignores edges pointing at nodes it does not hold", () => {
    const g = new RelationshipGraph([nodes[0]!], [{ from: "fouad", to: "ghost", kind: "KNOWS", strength: 5 }]);
    expect(g.neighbours("fouad")).toHaveLength(0);
  });
});
