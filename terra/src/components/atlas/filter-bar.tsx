"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, X, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn, humanise } from "@/lib/utils";

export interface FacetDef {
  key: string;
  label: string;
  options: string[];
}

/** Extra filters a saved view can carry that are not simple facets. */
const SCALAR_KEYS = ["minScore", "minMatches", "minPropertyValue", "uncontacted", "minStudents"];

export function FilterBar({
  facets,
  savedViews,
}: {
  facets: FacetDef[];
  savedViews: { key: string; label: string; query: Record<string, unknown> }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const selected = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const facet of facets) {
      const value = params.get(facet.key);
      map[facet.key] = value ? value.split(",").filter(Boolean) : [];
    }
    return map;
  }, [facets, params]);

  const push = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  const toggle = useCallback(
    (key: string, option: string) => {
      const next = new URLSearchParams(params.toString());
      const current = new Set(selected[key] ?? []);
      if (current.has(option)) current.delete(option);
      else current.add(option);
      if (current.size === 0) next.delete(key);
      else next.set(key, [...current].join(","));
      push(next);
    },
    [params, push, selected],
  );

  const applyView = useCallback(
    (view: { query: Record<string, unknown> }) => {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(view.query)) {
        const paramKey = key === "ownershipType" ? "ownership" : key;
        if (Array.isArray(value)) next.set(paramKey, value.join(","));
        else if (typeof value === "boolean") {
          if (value) next.set(paramKey, "1");
        } else next.set(paramKey, String(value));
      }
      setQuery("");
      push(next);
    },
    [push],
  );

  const activeCount =
    Object.values(selected).reduce((a, v) => a + v.length, 0) +
    SCALAR_KEYS.filter((k) => params.get(k)).length;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    push(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <form onSubmit={submitSearch} className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter institutions"
          aria-label="Filter institutions"
          className="h-7 w-52 rounded-sm border border-rule bg-ivory pl-7 pr-2 text-[12px] text-ink placeholder:text-stone-light focus:border-graphite focus:outline-none"
        />
      </form>

      {facets.map((facet) => {
        const chosen = selected[facet.key] ?? [];
        return (
          <DropdownMenu key={facet.key}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(chosen.length > 0 && "border-graphite bg-paper text-ink")}
              >
                {facet.label}
                {chosen.length > 0 ? (
                  <span className="num text-[10px] text-stone">{chosen.length}</span>
                ) : null}
                <ChevronDown className="size-2.5 text-stone" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
              {facet.options.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggle(facet.key, option);
                  }}
                >
                  <span
                    className={cn(
                      "flex size-3 shrink-0 items-center justify-center border",
                      chosen.includes(option) ? "border-ink bg-ink" : "border-rule",
                    )}
                  >
                    {chosen.includes(option) ? <Check className="size-2 text-ivory" /> : null}
                  </span>
                  {humanise(option)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Saved views <ChevronDown className="size-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {savedViews.map((view) => (
            <DropdownMenuItem key={view.key} onSelect={() => applyView(view)}>
              {view.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => push(new URLSearchParams())}>
            All institutions
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeCount > 0 || params.get("q") ? (
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setQuery("");
            push(new URLSearchParams());
          }}
        >
          <X className="size-2.5" /> Clear
        </Button>
      ) : null}

      {pending ? <span className="eyebrow">Filtering</span> : null}
    </div>
  );
}
