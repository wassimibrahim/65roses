// SHE'S YOURS — a timed reveal out of black. One tap skips to the end.
// Reduced motion shows the final state immediately. Gold lives here and almost nowhere else.
"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { RosePendant } from "@/components/world/RosePendant";
import { TextAction } from "@/components/ui/TextAction";

const STAGES = [600, 1200, 2400, 3200, 4000, 5000, 6000] as const;
// stage index:   0     1     2     3     4     5     6
// 0 gold light · 1 SHE'S YOURS. · 2 the Rose · 3 her number · 4 YOU'RE A ROSE.
// 5 the two dimmed lines · 6 ENTER 65

export function WelcomeSequence({ memberNumber, token }: { memberNumber: string; token: string }) {
  const [stage, setStage] = useState(-1);
  const done = stage >= STAGES.length - 1;

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (reduced) {
      setStage(STAGES.length - 1);
      return;
    }
    const timers = STAGES.map((t, i) => setTimeout(() => setStage(i), t));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  const at = (i: number) => ({
    opacity: stage >= i ? 1 : 0,
    transition: "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)",
  });

  return (
    <main
      className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-8"
      style={{ background: "var(--black)", cursor: done ? "auto" : "pointer" }}
      onClick={() => setStage(STAGES.length - 1)}
    >
      {/* the warm gold light blooming from centre */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          ...at(0),
          opacity: stage >= 0 ? 0.12 : 0,
          background: "radial-gradient(circle at 50% 46%, var(--gold) 0%, transparent 62%)",
        }}
      />

      <div style={at(1)}>
        <ChalkText as="h1" size="huge">
          {copy.welcome.shesYours}
        </ChalkText>
      </div>

      <div style={at(2)}>
        <RosePendant />
      </div>

      <div
        style={{
          ...at(3),
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.4em",
          fontSize: "0.9rem",
          color: "var(--gold)",
        }}
      >
        {memberNumber}
      </div>

      <div style={at(4)}>
        <ChalkText size="line">{copy.welcome.youreARose}</ChalkText>
      </div>

      <div className="flex flex-col items-center gap-2" style={at(5)}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            color: "var(--chalk-dim)",
          }}
        >
          {copy.welcome.beingMade}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            color: "var(--chalk-dim)",
          }}
        >
          {copy.welcome.firstNight}
        </span>
      </div>

      <div className="mt-4" style={at(6)}>
        <TextAction href={`/enter/create?t=${token}`} size="small">
          {copy.welcome.enter65}
        </TextAction>
      </div>
    </main>
  );
}
