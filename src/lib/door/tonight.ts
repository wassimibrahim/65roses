// The door is scoped to one night. This resolves which one, by the clock:
// the event whose window is open right now, soonest first.
//
// Once there are two cities there can be two open windows at once — Beirut and
// Madrid overlap for most of the night. A door session carries its city so a
// host in Madrid is never handed the list for Beirut.
import type { City } from "@prisma/client";
import { isWithinDoorWindow, OPENS_BEFORE_MS, CLOSES_AFTER_MS } from "./code";
import type { Db } from "@/lib/db/client";

export interface TonightEvent {
  id: string;
  name: string;
  index: string;
  city: City;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
}

export async function tonight(
  db: Db,
  now: Date = new Date(),
  city?: City,
): Promise<TonightEvent | null> {
  const candidates = await db.event.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      startsAt: { lte: new Date(now.getTime() + OPENS_BEFORE_MS) },
      endsAt: { gte: new Date(now.getTime() - CLOSES_AFTER_MS) },
      ...(city ? { city } : {}),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      name: true,
      index: true,
      city: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
    },
  });

  return candidates.find((e) => isWithinDoorWindow(e, now)) ?? null;
}

/** Every night whose doors are open right now, so a host can pick their city. */
export async function openTonight(db: Db, now: Date = new Date()): Promise<TonightEvent[]> {
  const candidates = await db.event.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      startsAt: { lte: new Date(now.getTime() + OPENS_BEFORE_MS) },
      endsAt: { gte: new Date(now.getTime() - CLOSES_AFTER_MS) },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      name: true,
      index: true,
      city: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
    },
  });

  return candidates.filter((e) => isWithinDoorWindow(e, now));
}
