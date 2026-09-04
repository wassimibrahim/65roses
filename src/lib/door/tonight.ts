// The door is scoped to one night. This resolves which one, by the clock:
// the event whose window is open right now, soonest first.
import { isWithinDoorWindow, OPENS_BEFORE_MS, CLOSES_AFTER_MS } from "./code";
import type { Db } from "@/lib/db/client";

export interface TonightEvent {
  id: string;
  name: string;
  index: string;
  startsAt: Date;
  endsAt: Date;
}

export async function tonight(db: Db, now: Date = new Date()): Promise<TonightEvent | null> {
  const candidates = await db.event.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      startsAt: { lte: new Date(now.getTime() + OPENS_BEFORE_MS) },
      endsAt: { gte: new Date(now.getTime() - CLOSES_AFTER_MS) },
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, name: true, index: true, startsAt: true, endsAt: true },
  });

  return candidates.find((e) => isWithinDoorWindow(e, now)) ?? null;
}
