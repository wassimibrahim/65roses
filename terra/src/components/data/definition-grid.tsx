import { cn } from "@/lib/utils";

export interface Definition {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  mono?: boolean;
}

/** Dense label/value grid — the workhorse of every entity page. */
export function DefinitionGrid({
  items,
  columns = 4,
  className,
}: {
  items: Definition[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-4", cols, className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="eyebrow mb-1">{item.label}</dt>
          <dd className={cn("text-[12.5px] leading-snug text-ink", item.mono && "num")}>
            {item.value}
          </dd>
          {item.hint ? (
            <dd className="mt-0.5 text-[10.5px] leading-snug text-stone">{item.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
