import Link from "next/link";
import { cn } from "@/lib/utils";

export interface EntityTab {
  key: string;
  label: string;
  count?: number;
}

/** Deep-linkable tabs. Every tab is a server-rendered URL, not client state. */
export function EntityTabs({
  tabs,
  active,
  basePath,
}: {
  tabs: EntityTab[];
  active: string;
  basePath: string;
}) {
  return (
    <nav className="no-scrollbar flex items-center gap-5 overflow-x-auto border-b border-rule-soft px-6 md:px-8">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.key === "overview" ? basePath : `${basePath}?tab=${tab.key}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b py-2.5 text-[12px] transition-colors",
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-stone hover:text-graphite",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 ? (
              <span className="num text-[9.5px] text-stone-light">{tab.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
