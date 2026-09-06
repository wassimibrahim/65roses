// the quiet row at the bottom of her page — and the only way out
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { copy } from "@/content/copy";

const item = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.65rem",
  letterSpacing: "0.25em",
  color: "var(--chalk-dim)",
} as const;

export function RoseNav() {
  return (
    <nav className="flex items-center justify-center gap-6 pb-10 pt-24" style={{ opacity: 0.7 }}>
      <Link href="/rose/nights" style={item}>
        {copy.roseHome.nav.nights}
      </Link>
      <Link href="/rose" style={item}>
        {copy.roseHome.nav.rose}
      </Link>
      <Link href="/rose/circle" style={item}>
        {copy.roseHome.nav.circle}
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{ ...item, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {copy.roseHome.nav.out}
      </button>
    </nav>
  );
}
