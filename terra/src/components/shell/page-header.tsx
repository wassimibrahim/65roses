import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
  className,
}: {
  crumbs?: Crumb[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-rule-soft px-6 pb-5 pt-6 md:px-8", className)}>
      {crumbs && crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-[10.5px]">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-2.5 text-stone-light" /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="text-stone transition-colors hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-graphite">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[27px] leading-tight text-ink">{title}</h1>
          {subtitle ? <div className="mt-1.5 text-[12px] text-stone">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
