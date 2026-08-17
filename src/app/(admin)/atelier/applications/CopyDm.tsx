// COPY DM — puts the Instagram DM on the clipboard for manual sending. Plain text, one link.
"use client";

import { useState } from "react";
import { copy, fill } from "@/content/copy";

export function CopyDm({ memberNumber, welcomeUrl }: { memberNumber: string; welcomeUrl: string }) {
  const [done, setDone] = useState(false);

  async function put() {
    await navigator.clipboard.writeText(
      fill(copy.instagramDm.approval, { memberNumber, welcomeUrl }),
    );
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <button type="button" className="atelier-action" onClick={put}>
      {done ? copy.atelier.applications.copied : copy.atelier.applications.copyDm}
    </button>
  );
}
