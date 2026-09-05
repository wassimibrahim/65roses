import * as React from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("border border-rule-soft bg-ivory", className)} {...props} />;
}

export function PanelHeader({
  title,
  meta,
  action,
  className,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-rule-soft px-4 py-2.5",
        className,
      )}
    >
      <div className="flex items-baseline gap-2.5 min-w-0">
        <h2 className="eyebrow">{title}</h2>
        {meta ? <span className="truncate text-[11px] text-stone">{meta}</span> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function Field({
  label,
  children,
  className,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="eyebrow mb-1">{label}</div>
      <div className={cn("text-[12.5px] text-ink", mono && "num")}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="h-px w-8 bg-rule" />
      <p className="text-[12.5px] text-graphite">{title}</p>
      {hint ? <p className="max-w-sm text-[11.5px] text-stone">{hint}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xs bg-parchment", className)} />;
}
