"use client";

import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileNav } from "@/components/shell/sidebar";
import { CommandPalette } from "@/components/shell/command-palette";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; initials?: string | null; title?: string | null };
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen">
        <Sidebar user={user} onOpenSearch={() => setSearchOpen(true)} />
        <div className="min-w-0 flex-1 pb-14 md:pb-0">{children}</div>
        <MobileNav />
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}
