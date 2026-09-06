// member DTO — the only shape of a member that ever reaches a client.
// Whitelist, not blacklist: fields are picked, never spread.
// roseHealth, counters, notes and AT_RISK never leave the server.
import type { MemberProfile, MemberStatus } from "@prisma/client";

// the only three words a member is ever shown
export type MemberStatusWord = "ACTIVE" | "QUIET" | "PAUSED";

export function toStatusWord(status: MemberStatus): MemberStatusWord {
  switch (status) {
    case "ACTIVE":
      return "ACTIVE";
    case "QUIET":
    case "AT_RISK": // she is never told she is at risk — operational label, not a message
      return "QUIET";
    default:
      return "PAUSED";
  }
}

export interface MemberDto {
  memberNumber: string;
  firstName: string;
  status: MemberStatusWord;
  city: MemberProfile["city"];
  phoneVerified: boolean;
}

// keys that must never appear in any member-facing payload — asserted in tests
export const FORBIDDEN_MEMBER_KEYS = [
  "roseHealth",
  "roseHealthAt",
  "eventsInvited",
  "eventsConfirmed",
  "eventsAttended",
  "eventsNoShow",
  "eventsDeclined",
  "notes",
  "phone",
  "dateOfBirth",
  "lastName",
  "wakeRequestedAt",
  "statusChangedAt",
  "deletedAt",
  "userId",
  "applicationId",
] as const;

export function toMemberDto(member: MemberProfile): MemberDto {
  return {
    memberNumber: member.memberNumber,
    firstName: member.firstName,
    status: toStatusWord(member.status),
    city: member.city,
    phoneVerified: member.phoneVerified,
  };
}
