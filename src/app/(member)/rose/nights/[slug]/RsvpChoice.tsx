// ARE YOU COMING? — one question, two answers, quiet changes of mind until the deadline
"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { TextAction } from "@/components/ui/TextAction";
import { Reveal } from "@/components/ui/Reveal";
import { respond, type RsvpOutcome } from "./actions";

type View = "OPEN" | "CONFIRMED" | "DECLINED" | "FULL" | "CLOSED";

export function RsvpChoice({
  eventId,
  initial,
  readOnly,
  stemsAllowed,
  stemFirstName,
}: {
  eventId: string;
  initial: View;
  readOnly: boolean;
  stemsAllowed: boolean;
  stemFirstName: string | null;
}) {
  const [view, setView] = useState<View>(initial);
  const [busy, setBusy] = useState(false);

  async function answer(a: "YES" | "NOT_THIS_TIME") {
    if (busy) return;
    setBusy(true);
    const outcome: RsvpOutcome = await respond({ eventId, answer: a });
    setBusy(false);
    if (outcome === "NONE") return;
    setView(outcome);
  }

  if (view === "FULL") {
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-4 text-center">
          <ChalkText size="huge">{copy.rsvp.full}</ChalkText>
          <MonoText>{copy.rsvp.nextTime}</MonoText>
        </div>
      </Reveal>
    );
  }

  if (view === "CONFIRMED") {
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-10 text-center">
          <ChalkText size="line">{copy.rsvp.confirmed}</ChalkText>
          {stemFirstName ? (
            <ChalkText size="small">{stemFirstName}</ChalkText>
          ) : stemsAllowed && !readOnly ? (
            <div className="flex flex-col items-center gap-5">
              <ChalkText size="small">{copy.stem.oneRoseOneStem}</ChalkText>
              <TextAction href={`/rose/stem/${eventId}`} size="small">
                {copy.stem.whoAreYouBringing}
              </TextAction>
            </div>
          ) : null}
        </div>
      </Reveal>
    );
  }

  if (view === "DECLINED") {
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-6 text-center">
          <ChalkText size="line">{copy.rsvp.declined}</ChalkText>
          <MonoText>{copy.rsvp.savedForAnother}</MonoText>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => setView("OPEN")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                color: "var(--chalk-dim)",
                opacity: 0.7,
              }}
            >
              {copy.rsvp.changedYourMind}
            </button>
          ) : null}
        </div>
      </Reveal>
    );
  }

  if (view === "CLOSED" || readOnly) {
    // after the deadline the page shows only her answer — nothing to press
    return (
      <div className="flex flex-col items-center text-center">
        <MonoText>{copy.night.areYouComing}</MonoText>
      </div>
    );
  }

  return (
    <Reveal>
      <div className="flex flex-col items-center gap-10 text-center">
        <ChalkText size="line">{copy.night.areYouComing}</ChalkText>
        <div className="flex flex-col items-center gap-6">
          <TextAction disabled={busy} onClick={() => answer("YES")}>
            {copy.night.yes}
          </TextAction>
          <TextAction
            variant="quiet"
            size="small"
            disabled={busy}
            onClick={() => answer("NOT_THIS_TIME")}
          >
            {copy.night.notThisTime}
          </TextAction>
        </div>
      </div>
    </Reveal>
  );
}
