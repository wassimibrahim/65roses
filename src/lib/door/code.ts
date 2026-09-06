// Door codes: 4 digits, hashed at rest, single-use, and dead outside the night.
// Four digits is a small space, so the pepper in hashCode is the real defense
// and the window is the second one — a code is only a code between 22:00 and 06:00.
import { randomInt } from "node:crypto";
import { hashCode, verifyCode } from "@/lib/crypto/hash";

export const DOOR_CODE_LENGTH = 4;

// the code lives from two hours before the doors to an hour after they close
export const OPENS_BEFORE_MS = 2 * 60 * 60 * 1000;
export const CLOSES_AFTER_MS = 1 * 60 * 60 * 1000;

export function generateDoorCode(): string {
  return String(randomInt(0, 10 ** DOOR_CODE_LENGTH)).padStart(DOOR_CODE_LENGTH, "0");
}

// the context binds a code to one person at one night — a code minted for
// SERENA can never open TALIA, and hers can never open his
export function roseCodeContext(eventId: string, memberId: string): string {
  return `door:${eventId}:rose:${memberId}`;
}

export function stemCodeContext(eventId: string, stemGuestId: string): string {
  return `door:${eventId}:stem:${stemGuestId}`;
}

export function hashDoorCode(code: string, context: string): string {
  return hashCode(code, context);
}

export interface DoorWindow {
  startsAt: Date;
  endsAt: Date;
}

export function isWithinDoorWindow(event: DoorWindow, now: Date = new Date()): boolean {
  return (
    now.getTime() >= event.startsAt.getTime() - OPENS_BEFORE_MS &&
    now.getTime() <= event.endsAt.getTime() + CLOSES_AFTER_MS
  );
}

export interface DoorCodeRecord {
  doorCodeHash: string | null;
  doorCodeUsedAt: Date | null;
}

export type DoorCodeVerdict = "OK" | "WRONG" | "USED" | "CLOSED" | "NOT_ISSUED";

/**
 * Pure verification. The caller marks the code used inside a transaction —
 * this only says whether it would open the door right now.
 */
export function checkDoorCode(
  input: string,
  record: DoorCodeRecord,
  context: string,
  event: DoorWindow,
  now: Date = new Date(),
): DoorCodeVerdict {
  if (!isWithinDoorWindow(event, now)) return "CLOSED";
  if (!record.doorCodeHash) return "NOT_ISSUED";
  if (record.doorCodeUsedAt) return "USED";
  if (!/^\d{4}$/.test(input)) return "WRONG";
  return verifyCode(input, context, record.doorCodeHash) ? "OK" : "WRONG";
}
