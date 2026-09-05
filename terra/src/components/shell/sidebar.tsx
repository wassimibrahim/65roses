"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Settings, LogOut } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/session";

export function Sidebar({
  user,
  onOpenSearch,
}: {
  user: { name: string; initials?: string | null; title?: string | null };
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="hidden w-[186px] shrink-0 flex-col border-r border-rule-soft bg-paper md:flex"
    >
      <div className="px-4 pb-6 pt-5">
        <Link href="/command" className="block">
          <span className="display block text-[19px] leading-none tracking-[0.18em] text-ink">
            TERRA
          </span>
          <span className="eyebrow mt-1.5 block">Capital Intelligence</span>
        </Link>
      </div>

      <ul className="flex-1 space-y-px px-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xs px-2 py-1.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-linen/60 font-medium text-ink"
                    : "text-graphite hover:bg-linen/35 hover:text-ink",
                )}
              >
                <Icon className={cn("size-3.5", active ? "text-ink" : "text-stone")} strokeWidth={1.6} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="space-y-px border-t border-rule-soft px-2 py-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2.5 rounded-xs px-2 py-1.5 text-[12.5px] text-graphite transition-colors hover:bg-linen/35 hover:text-ink"
        >
          <Search className="size-3.5 text-stone" strokeWidth={1.6} />
          Search
          <kbd className="ml-auto font-mono text-[9.5px] text-stone-light">⌘K</kbd>
        </button>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-xs px-2 py-1.5 text-[12.5px] transition-colors",
            pathname.startsWith("/settings")
              ? "bg-linen/60 font-medium text-ink"
              : "text-graphite hover:bg-linen/35 hover:text-ink",
          )}
        >
          <Settings className="size-3.5 text-stone" strokeWidth={1.6} />
          Settings
        </Link>
      </div>

      <div className="flex items-center gap-2.5 border-t border-rule-soft px-3 py-3">
        <span className="flex size-6 shrink-0 items-center justify-center border border-rule bg-ivory font-mono text-[9.5px] text-graphite">
          {user.initials ?? user.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] leading-tight text-ink">{user.name}</span>
          <span className="block truncate text-[10px] leading-tight text-stone">{user.title}</span>
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Sign out"
            className="text-stone transition-colors hover:text-ink"
          >
            <LogOut className="size-3.5" strokeWidth={1.6} />
            <span className="sr-only">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

/** Mobile: the same destinations, along the bottom edge. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule bg-paper md:hidden"
    >
      {NAV.slice(0, 5).map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2",
              active ? "text-ink" : "text-stone",
            )}
          >
            <Icon className="size-4" strokeWidth={1.6} />
            <span className="text-[9px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
