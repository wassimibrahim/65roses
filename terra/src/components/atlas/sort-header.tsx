"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortHeader({
  sortKey,
  label,
  align = "left",
  defaultDirection = "desc",
}: {
  sortKey: string;
  label: string;
  align?: "left" | "right";
  defaultDirection?: "asc" | "desc";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeKey = params.get("sort") ?? "score";
  const activeDirection = (params.get("direction") ?? "desc") as "asc" | "desc";
  const active = activeKey === sortKey;

  function onClick() {
    const next = new URLSearchParams(params.toString());
    next.set("sort", sortKey);
    next.set("direction", active ? (activeDirection === "asc" ? "desc" : "asc") : defaultDirection);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1 uppercase transition-colors hover:text-ink",
        align === "right" && "justify-end",
        active && "text-ink",
      )}
    >
      {label}
      {active ? (
        activeDirection === "asc" ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />
      ) : null}
    </button>
  );
}
