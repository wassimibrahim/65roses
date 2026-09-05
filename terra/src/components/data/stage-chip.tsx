import { Badge } from "@/components/ui/badge";
import { humanise } from "@/lib/utils";

/**
 * Pipeline stage. Deliberately monochrome apart from the two ends of the
 * process — status colour is noise in an institutional table.
 */
const TONE: Record<string, "neutral" | "forest" | "burgundy" | "quiet" | "ink"> = {
  LEAD: "quiet",
  QUALIFIED: "neutral",
  MANDATE_DISCUSSION: "neutral",
  ENGAGED: "ink",
  PREPARATION: "ink",
  MARKETED: "ink",
  IOI: "ink",
  LOI: "ink",
  DUE_DILIGENCE: "ink",
  SIGNING: "forest",
  CLOSING: "forest",
  CLOSED: "forest",
  LOST: "burgundy",
  PAUSED: "quiet",
};

export function StageChip({ stage }: { stage: string }) {
  return (
    <Badge tone={TONE[stage] ?? "neutral"} mono>
      {humanise(stage)}
    </Badge>
  );
}
