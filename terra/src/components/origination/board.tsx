"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { moveOpportunityStage } from "@/app/actions/opportunity";
import { ScoreMark } from "@/components/ui/score";
import { AccessChip } from "@/components/data/access-chip";
import { moneyRange, percent, date as fmtDate } from "@/lib/format";
import { cn, humanise } from "@/lib/utils";

export interface BoardRow {
  id: string;
  stage: string;
  name: string;
  slug: string;
  city: string | null;
  type: string;
  score: number;
  overridden: boolean;
  evLow: number | null;
  evHigh: number | null;
  probability: number | null;
  whyNow: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  owner: string | null;
  accessTier: string;
  matches: { name: string; score: number }[];
  transactionType: string | null;
}

/**
 * Kanban over the origination stages. Uses native drag and drop rather than a
 * library — the interaction is one drag, and a dependency would not earn itself.
 */
export function OriginationBoard({ stages, rows }: { stages: string[]; rows: BoardRow[] }) {
  const [pending, startTransition] = useTransition();
  const [optimisticRows, applyMove] = useOptimistic(
    rows,
    (state: BoardRow[], move: { id: string; stage: string }) =>
      state.map((r) => (r.id === move.id ? { ...r, stage: move.stage } : r)),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opportunities already past origination still need somewhere to live.
  const boardStages = [
    ...stages,
    ...Array.from(new Set(optimisticRows.map((r) => r.stage))).filter((s) => !stages.includes(s)),
  ];

  function onDrop(stage: string) {
    setOver(null);
    const id = dragging;
    setDragging(null);
    if (!id) return;
    const row = optimisticRows.find((r) => r.id === id);
    if (!row || row.stage === stage) return;

    setError(null);
    startTransition(async () => {
      applyMove({ id, stage });
      const result = await moveOpportunityStage({ opportunityId: id, stage });
      if (!result.ok) setError(result.error ?? "That change could not be saved.");
    });
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-[11.5px] text-burgundy">
          {error}
        </p>
      ) : null}

      <div className="no-scrollbar flex gap-px overflow-x-auto border border-rule-soft bg-rule-soft">
        {boardStages.map((stage) => {
          const items = optimisticRows.filter((r) => r.stage === stage);
          return (
            <section
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver((s) => (s === stage ? null : s))}
              onDrop={() => onDrop(stage)}
              className={cn(
                "flex min-h-[420px] w-[248px] shrink-0 flex-col bg-ivory transition-colors",
                over === stage && "bg-paper",
              )}
            >
              <header className="flex items-baseline justify-between gap-2 border-b border-rule-soft px-3 py-2.5">
                <h3 className="eyebrow">{humanise(stage)}</h3>
                <span className="num text-[10px] text-stone-light">{items.length}</span>
              </header>

              <ul className="flex-1 space-y-px">
                {items.map((row) => (
                  <li
                    key={row.id}
                    draggable
                    onDragStart={() => setDragging(row.id)}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "group cursor-grab border-b border-rule-soft px-3 py-3 active:cursor-grabbing",
                      dragging === row.id && "opacity-40",
                      pending && "transition-opacity",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/atlas/${row.slug}`}
                        className="text-[12.5px] leading-snug text-ink hover:underline"
                      >
                        {row.name}
                      </Link>
                      <ScoreMark score={row.score} size="sm" overridden={row.overridden} />
                    </div>

                    <p className="mt-0.5 text-[10.5px] text-stone">
                      {[row.city, humanise(row.type)].filter(Boolean).join(" · ")}
                    </p>

                    <p className="num mt-2 text-[11px] text-graphite">
                      {moneyRange(row.evLow, row.evHigh)}
                      {row.probability !== null ? (
                        <span className="text-stone"> · {percent(row.probability)}</span>
                      ) : null}
                    </p>

                    {row.whyNow ? (
                      <p className="mt-2 line-clamp-3 text-[10.5px] leading-relaxed text-graphite">
                        {row.whyNow}
                      </p>
                    ) : (
                      <p className="mt-2 text-[10.5px] text-burgundy">Why now not recorded.</p>
                    )}

                    {row.nextAction ? (
                      <p className="mt-2 border-t border-rule-soft pt-2 text-[10.5px] leading-relaxed text-ink">
                        {row.nextAction}
                        {row.nextActionDate ? (
                          <span
                            className={cn(
                              "num ml-1",
                              new Date(row.nextActionDate).getTime() < Date.now()
                                ? "text-burgundy"
                                : "text-stone",
                            )}
                          >
                            {fmtDate(row.nextActionDate)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <AccessChip tier={row.accessTier} />
                      <GripVertical className="size-3 text-linen opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    {row.matches.length > 0 ? (
                      <p className="mt-1.5 truncate text-[10px] text-stone">
                        {row.matches.map((m) => `${m.name} ${m.score}`).join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-[10.5px] text-stone">
        Drag a card to change its stage. Every move is written to the audit log.
      </p>
    </div>
  );
}
