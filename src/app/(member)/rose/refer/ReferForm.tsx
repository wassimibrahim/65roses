// one field, one quiet answer
"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { Field } from "@/components/ui/Field";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { submitReferral } from "./actions";

export function ReferForm() {
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <Reveal>
          <MonoText>{copy.refer.fromHere}</MonoText>
        </Reveal>
        <Serial />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8">
      <Reveal>
        <div className="flex flex-col gap-10">
          <ChalkText as="h1" size="line">
            {copy.refer.knowARose}
          </ChalkText>
          <form
            className="flex flex-col gap-8"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || handle.trim() === "") return;
              setBusy(true);
              await submitReferral({ handle, note });
              setDone(true);
            }}
          >
            <Field
              id="handle"
              label={copy.apply.fields.instagram}
              autoFocus
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <div>
              <input
                id="note"
                className="field-input"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label={copy.refer.anythingWeShouldKnow}
              />
              <div
                className="mt-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "var(--chalk-dim)",
                  opacity: 0.6,
                }}
              >
                {copy.refer.anythingWeShouldKnow}
              </div>
            </div>
            <div>
              <TextAction type="submit" size="small" disabled={busy}>
                {copy.refer.sendHer}
              </TextAction>
            </div>
          </form>
        </div>
      </Reveal>
      <Serial />
    </main>
  );
}
