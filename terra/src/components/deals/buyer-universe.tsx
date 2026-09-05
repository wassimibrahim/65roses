"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { moveBuyerStage } from "@/app/actions/deal";
import { Badge } from "@/components/ui/badge";
import { StrengthMarks } from "@/components/ui/score";
import { money } from "@/lib/format";
import { cn, humanise } from "@/lib/utils";

export interface BuyerRow {
  id: string;
  stage: string;
  organisationName: string;
  organisationSlug: string;
  organisationType: string;
  hq: string | null;
  rationale: string | null;
  relationshipStrength: number | null;
  ioiValue: number | null;
  loiValue: number | null;
  notes: string | null;
}

/**
 * Longlist to selected, as a pipeline. Rejected is a column rather than a
 * deletion, because why a buyer said no is part of the record.
 */
export function BuyerUniverse({ stages, rows }: { stages: string[]; rows: BuyerRow[] }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, applyMove] = useOptimistic(
    rows,
    (state: BuyerRow[], move: { id: string; stage: string }) =>
      state.map((r) => (r.id === move.id ? { ...r, stage: move.stage } : r)),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onDrop(stage: string) {
    setOver(null);
    const id = dragging;
    setDragging(null);
    if (!id) return;
    const row = optimistic.find((r) => r.id === id);
    if (!row || row.stage === stage) return;

    setError(null);
    startTransition(async () => {
      applyMove({ id, stage });
      const result = await moveBuyerStage({ entryId: id, stage });
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
        {stages.map((stage) => {
          const items = optimistic.filter((r) => r.stage === stage);
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
                "flex min-h-[300px] w-[204px] shrink-0 flex-col bg-ivory transition-colors",
                over === stage && "bg-paper",
                stage === "REJECTED" && "opacity-70",
              )}
            >
              <header className="flex items-baseline justify-between gap-2 border-b border-rule-soft px-3 py-2">
                <h3 className="eyebrow">{humanise(stage)}</h3>
                <span className="num text-[10px] text-stone-light">{items.length}</span>
              </header>
              <ul className={cn("flex-1", pending && "transition-opacity")}>
                {items.map((row) => (
                  <li
                    key={row.id}
                    draggable
                    onDragStart={() => setDragging(row.id)}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "cursor-grab border-b border-rule-soft px-3 py-2.5 active:cursor-grabbing",
                      dragging === row.id && "opacity-40",
                    )}
                  >
                    <Link
                      href={`/investors/${row.organisationSlug}`}
                      className="text-[12px] leading-snug text-ink hover:underline"
                    >
                      {row.organisationName}
                    </Link>
                    <p className="mt-0.5 text-[10px] text-stone">{humanise(row.organisationType)}</p>
                    {row.relationshipStrength ? (
                      <div className="mt-1.5">
                        <StrengthMarks strength={row.relationshipStrength} />
                      </div>
                    ) : null}
                    {row.rationale ? (
                      <p className="mt-1.5 line-clamp-3 text-[10px] leading-relaxed text-graphite">
                        {row.rationale}
                      </p>
                    ) : null}
                    {row.loiValue ?? row.ioiValue ? (
                      <p className="num mt-1.5 text-[10.5px] text-ink">
                        {row.loiValue ? `LOI ${money(row.loiValue)}` : `IOI ${money(row.ioiValue)}`}
                      </p>
                    ) : null}
                    {row.notes ? (
                      <p className="mt-1 text-[10px] leading-relaxed text-stone">{row.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-[10.5px] text-stone">
        Drag a buyer to move them through the process. Every move is audited.
      </p>
    </div>
  );
}
