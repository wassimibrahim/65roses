// The hourly pass. Every job in here is idempotent by construction, so running
// it twice in the same hour, or missing an hour entirely, changes nothing.
import type { Db } from "@/lib/db/client";
import { issueDoorCodes, type DoorCodeRun } from "./door-codes";
import { revealVenue } from "./venue-reveal";
import { closeAndFollowUp, type PostEventRun } from "./post-event";

export interface HourlyRun {
  codes: DoorCodeRun;
  venue: number;
  postEvent: PostEventRun;
}

export async function runHourly(db: Db, now: Date = new Date()): Promise<HourlyRun> {
  // order matters once: settle last night before minting codes for tonight
  const postEvent = await closeAndFollowUp(db, now);
  const codes = await issueDoorCodes(db, now);
  const venue = await revealVenue(db, now);
  return { codes, venue, postEvent };
}

export { issueDoorCodes, revealVenue, closeAndFollowUp };
