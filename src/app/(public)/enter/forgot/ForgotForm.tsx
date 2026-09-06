// forgot — one field, one unchanging answer
"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { Field } from "@/components/ui/Field";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { requestReset } from "./actions";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <Reveal>
          <ChalkText size="line">{copy.account.forgot}</ChalkText>
        </Reveal>
        <Serial />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8">
      <form
        className="flex flex-col gap-10"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          await requestReset({ email });
          setSent(true);
        }}
      >
        <Field
          id="email"
          label={copy.enter.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <TextAction type="submit" size="small" disabled={busy}>
            {copy.landing.enter}
          </TextAction>
        </div>
      </form>
      <Serial />
    </main>
  );
}
