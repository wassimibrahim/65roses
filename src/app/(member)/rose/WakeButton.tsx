// WAKE MY ROSE — one quiet ask; after that, the atelier has her
"use client";

import { useTransition } from "react";
import { copy } from "@/content/copy";
import { TextAction } from "@/components/ui/TextAction";
import { wakeMyRose } from "./actions";

export function WakeButton() {
  const [pending, start] = useTransition();
  return (
    <TextAction
      variant="quiet"
      size="small"
      disabled={pending}
      onClick={() => start(() => wakeMyRose())}
    >
      {copy.roseHome.wakeMyRose}
    </TextAction>
  );
}
