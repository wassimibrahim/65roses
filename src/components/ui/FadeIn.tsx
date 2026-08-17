// <FadeIn /> — fades a section in once, at 25% viewport intersection, 600ms. Never fades out.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={["fadein", className].filter(Boolean).join(" ")} data-seen={seen}>
      {children}
    </div>
  );
}
