"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GraphView } from "@/server/relationships";
import { cn } from "@/lib/utils";

const HREF: Record<string, (id: string) => string> = {
  person: (id) => `/relationships/person/${id}`,
  organisation: (id) => `/investors/id/${id}`,
  institution: (id) => `/atlas/id/${id}`,
};

const WIDTH = 900;
const HEIGHT = 560;

/**
 * A deterministic concentric layout rather than a force simulation: the focus
 * node sits at the centre, first-degree contacts on the inner ring, second
 * degree outside them. It reads the same every time, which matters when two
 * people are looking at the same screen in a meeting.
 */
export function RelationshipNetwork({ view }: { view: GraphView }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const positioned = useMemo(() => {
    const byDegree = new Map<number, typeof view.nodes>();
    for (const node of view.nodes) {
      const list = byDegree.get(node.degree) ?? [];
      list.push(node);
      byDegree.set(node.degree, list);
    }

    const positions = new Map<string, { x: number; y: number }>();
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const radii = [0, 150, 250];

    for (const [degree, nodes] of byDegree) {
      if (degree === 0) {
        positions.set(nodes[0]!.id, { x: cx, y: cy });
        continue;
      }
      const radius = radii[Math.min(degree, radii.length - 1)]!;
      // Offset each ring so nodes do not line up radially with the ring inside it.
      const offset = degree * 0.4;
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2 + offset;
        positions.set(node.id, {
          x: cx + Math.cos(angle) * radius * 1.5,
          y: cy + Math.sin(angle) * radius,
        });
      });
    }
    return positions;
  }, [view.nodes]);

  const connected = useMemo(() => {
    if (!hovered) return null;
    const set = new Set<string>([hovered]);
    for (const e of view.edges) {
      if (e.from === hovered) set.add(e.to);
      if (e.to === hovered) set.add(e.from);
    }
    return set;
  }, [hovered, view.edges]);

  if (view.nodes.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[12px] text-stone">
        Nothing connected to show.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[560px] w-full min-w-[720px]"
        role="img"
        aria-label="Relationship network"
      >
        <g>
          {view.edges.map((edge, i) => {
            const a = positioned.get(edge.from);
            const b = positioned.get(edge.to);
            if (!a || !b) return null;
            const dim = connected && !(connected.has(edge.from) && connected.has(edge.to));
            return (
              <line
                key={`${edge.from}-${edge.to}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={edge.strength >= 4 ? "#1f4d3a" : "#d9d4ca"}
                strokeWidth={edge.strength >= 4 ? 1.2 : 0.7}
                opacity={dim ? 0.12 : edge.strength >= 4 ? 0.65 : 0.5}
              />
            );
          })}
        </g>

        <g>
          {view.nodes.map((node) => {
            const p = positioned.get(node.id);
            if (!p) return null;
            const dim = connected && !connected.has(node.id);
            const r = node.degree === 0 ? 7 : node.kind === "institution" ? 5 : 4;
            const fill =
              node.internal ? "#16181a"
                : node.kind === "institution" ? "#a4884f"
                : node.kind === "organisation" ? "#4a5054"
                : "#9aa0a3";
            return (
              <g
                key={node.id}
                opacity={dim ? 0.2 : 1}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <Link href={HREF[node.kind]!(node.id)}>
                  {node.kind === "institution" ? (
                    <rect x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} fill={fill} />
                  ) : (
                    <circle cx={p.x} cy={p.y} r={r} fill={fill} />
                  )}
                  <text
                    x={p.x}
                    y={p.y - r - 5}
                    textAnchor="middle"
                    fontSize={node.degree === 0 ? 11 : 9.5}
                    fill={node.degree === 0 ? "#16181a" : "#4a5054"}
                    fontFamily="var(--font-inter)"
                  >
                    {node.label.length > 26 ? `${node.label.slice(0, 24)}…` : node.label}
                  </text>
                </Link>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule-soft px-4 py-2.5">
        <Legend colour="#16181a" shape="circle" label="Terra" />
        <Legend colour="#9aa0a3" shape="circle" label="Person" />
        <Legend colour="#4a5054" shape="circle" label="Organisation" />
        <Legend colour="#a4884f" shape="square" label="Institution" />
        <span className="flex items-center gap-1.5 text-[10.5px] text-stone">
          <span className="inline-block h-px w-4 bg-forest" /> Warm or trusted
        </span>
      </div>
    </div>
  );
}

function Legend({ colour, shape, label }: { colour: string; shape: "circle" | "square"; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10.5px] text-stone">
      <span
        className={cn("inline-block size-2", shape === "circle" && "rounded-full")}
        style={{ background: colour }}
      />
      {label}
    </span>
  );
}
