// ROSE CIRCLE — one word, one action, and the link only after she asks.
"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { TextAction } from "@/components/ui/TextAction";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { revealCircleLink } from "./actions";

export function CircleJoin() {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-12 px-8">
      <Reveal>
        <ChalkText as="h1" size="line">
          {copy.circle.name}
        </ChalkText>
      </Reveal>

      {link ? (
        <Reveal>
          <div className="flex flex-col items-center gap-6">
            <a href={link} target="_blank" rel="noreferrer">
              <MonoText dim={false}>{link}</MonoText>
            </a>
            <TextAction
              variant="quiet"
              size="small"
              onClick={async () => {
                await navigator.clipboard.writeText(link).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? copy.atelier.applications.copied : copy.circle.copy}
            </TextAction>
          </div>
        </Reveal>
      ) : (
        <TextAction
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await revealCircleLink();
            setLink(result.link);
            setBusy(false);
          }}
        >
          {copy.circle.join}
        </TextAction>
      )}

      <Serial />
    </main>
  );
}
