"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { globalSearch, type SearchHit } from "@/server/search";
import { NAV } from "@/lib/nav";

const GROUP_ORDER = [
  "Schools",
  "Investors & operators",
  "People",
  "Deals",
  "Real estate",
  "Precedent transactions",
  "Intelligence",
  "Notes",
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  // Guards against an earlier, slower request overwriting a later one.
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const results = await globalSearch(q);
        if (requestId.current === id) setHits(results);
      });
    }, 110);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: hits.filter((h) => h.group === group),
  })).filter((g) => g.items.length > 0);

  const showNav = query.trim().length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0" hideClose>
        <DialogTitle className="sr-only">Search Terra</DialogTitle>
        <Command shouldFilter={false} loop className="outline-none">
          <div className="flex items-center gap-2.5 border-b border-rule-soft px-4">
            <Search className="size-3.5 shrink-0 text-stone" strokeWidth={1.6} />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search schools, investors, people, deals…"
              className="h-11 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-stone-light"
            />
            {pending ? <span className="eyebrow shrink-0">Searching</span> : null}
          </div>

          <Command.List className="max-h-[52vh] overflow-y-auto px-2 py-2">
            {showNav ? (
              <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {NAV.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xs px-2 py-1.5 text-[12.5px] text-graphite data-[selected=true]:bg-paper data-[selected=true]:text-ink"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10.5px] text-stone">{item.description}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {!showNav && !pending && grouped.length === 0 ? (
              <Command.Empty className="px-3 py-8 text-center text-[12px] text-stone">
                Nothing matches “{query}”.
              </Command.Empty>
            ) : null}

            {grouped.map(({ group, items }) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {items.map((hit) => (
                  <Command.Item
                    key={`${hit.group}-${hit.id}`}
                    value={`${hit.group}-${hit.id}`}
                    onSelect={() => go(hit.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-xs px-2 py-1.5 data-[selected=true]:bg-paper"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="block truncate text-[10.5px] text-stone">{hit.subtitle}</span>
                      ) : null}
                    </span>
                    {hit.meta ? (
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-stone">
                        {hit.meta}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center justify-between border-t border-rule-soft px-4 py-2">
            <span className="text-[10.5px] text-stone-light">
              Confidential — Terra Capital
            </span>
            <span className="flex items-center gap-1 text-[10.5px] text-stone-light">
              <CornerDownLeft className="size-3" /> to open
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
