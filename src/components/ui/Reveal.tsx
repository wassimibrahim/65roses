// <Reveal /> — fade-in-on-mount, 600ms, nothing else; prefers-reduced-motion shows it immediately
"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={["reveal", className].filter(Boolean).join(" ")} data-mounted={mounted}>
      {children}
    </div>
  );
}
