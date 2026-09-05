"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Minus, CircleDot, Ban } from "lucide-react";
import { setProcessItemStatus } from "@/app/actions/deal";
import { Badge } from "@/components/ui/badge";
import { date as fmtDate } from "@/lib/format";
import { cn, humanise } from "@/lib/utils";

export interface ProcessRow {
  id: string;
  label: string;
  status: string;
  dueDate: string | null;
  ownerName: string | null;
  critical: boolean;
}

// Clicking cycles through the states an item actually moves between.
const NEXT: Record<string, string> = {
  NOT_STARTED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETE",
  COMPLETE: "NOT_STARTED",
  BLOCKED: "IN_PROGRESS",
  NOT_APPLICABLE: "NOT_STARTED",
};

function StatusMark({ status }: { status: string }) {
  if (status === "COMPLETE")
    return (
      <span className="flex size-4 items-center justify-center border border-forest bg-forest">
        <Check className="size-2.5 text-ivory" />
      </span>
    );
  if (status === "IN_PROGRESS")
    return (
      <span className="flex size-4 items-center justify-center border border-graphite">
        <CircleDot className="size-2.5 text-graphite" />
      </span>
    );
  if (status === "BLOCKED")
    return (
      <span className="flex size-4 items-center justify-center border border-burgundy bg-burgundy-soft">
        <Ban className="size-2.5 text-burgundy" />
      </span>
    );
  if (status === "NOT_APPLICABLE")
    return (
      <span className="flex size-4 items-center justify-center border border-linen">
        <Minus className="size-2.5 text-stone-light" />
      </span>
    );
  return <span className="block size-4 border border-rule" />;
}

export function ProcessChecklist({ rows }: { rows: ProcessRow[] }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, applyStatus] = useOptimistic(
    rows,
    (state: ProcessRow[], change: { id: string; status: string }) =>
      state.map((r) => (r.id === change.id ? { ...r, status: change.status } : r)),
  );
  const [error, setError] = useState<string | null>(null);

  function cycle(row: ProcessRow) {
    const status = NEXT[row.status] ?? "IN_PROGRESS";
    setError(null);
    startTransition(async () => {
      applyStatus({ id: row.id, status });
      const result = await setProcessItemStatus({ itemId: row.id, status });
      if (!result.ok) setError(result.error ?? "That change could not be saved.");
    });
  }

  const complete = optimistic.filter((r) => r.status === "COMPLETE").length;

  return (
    <div>
      {error ? (
        <p role="alert" className="px-4 pt-3 text-[11.5px] text-burgundy">
          {error}
        </p>
      ) : null}

      <ul className={cn(pending && "transition-opacity")}>
        {optimistic.map((row) => {
          const overdue =
            row.dueDate &&
            row.status !== "COMPLETE" &&
            new Date(row.dueDate).getTime() < Date.now();
          return (
            <li
              key={row.id}
              className="flex items-center gap-3 border-b border-rule-soft px-4 py-2.5 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => cycle(row)}
                aria-label={`${row.label}: ${humanise(row.status)}. Click to advance.`}
                className="shrink-0"
              >
                <StatusMark status={row.status} />
              </button>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[12.5px]",
                    row.status === "COMPLETE" ? "text-stone" : "text-ink",
                  )}
                >
                  {row.label}
                  {row.critical ? (
                    <Badge tone="quiet" mono className="ml-2">
                      Critical
                    </Badge>
                  ) : null}
                </span>
                {row.ownerName ? (
                  <span className="block text-[10.5px] text-stone">{row.ownerName}</span>
                ) : null}
              </span>

              {row.dueDate ? (
                <span className={cn("num shrink-0 text-[11px]", overdue ? "text-burgundy" : "text-stone")}>
                  {fmtDate(row.dueDate)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="border-t border-rule-soft px-4 py-2.5 text-[10.5px] text-stone">
        {complete} of {optimistic.length} complete. Click a marker to advance an item.
      </p>
    </div>
  );
}
