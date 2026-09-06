// dto: the member payload never carries internal fields; statuses collapse to three words;
// the venue never leaves the server before venueRevealAt
import { describe, expect, it } from "vitest";
import type { Event, MemberProfile } from "@prisma/client";
import { FORBIDDEN_MEMBER_KEYS, toMemberDto, toStatusWord } from "./member";
import { toEventDto } from "./event";

const member = {
  id: "m_1",
  userId: "u_1",
  applicationId: "a_1",
  memberNumber: "0065",
  firstName: "SERENA",
  lastName: "HADDAD",
  instagramHandle: "serena",
  phone: "+9613123456",
  phoneVerified: true,
  phoneVerifiedAt: new Date(),
  dateOfBirth: new Date("2000-01-01"),
  city: "BEIRUT",
  area: "Mar Mikhael",
  status: "AT_RISK",
  foundingRose: true,
  roseHealth: 37,
  roseHealthAt: new Date(),
  eventsInvited: 9,
  eventsConfirmed: 6,
  eventsAttended: 3,
  eventsNoShow: 3,
  eventsDeclined: 0,
  lastAttendanceAt: new Date(),
  lastInvitedAt: new Date(),
  wakeRequestedAt: null,
  statusChangedAt: new Date(),
  communityStatus: "JOINED",
  communityJoinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as MemberProfile;

describe("member dto", () => {
  it("contains no forbidden key, even serialized", () => {
    const json = JSON.stringify(toMemberDto(member));
    for (const key of FORBIDDEN_MEMBER_KEYS) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(json).not.toContain("37"); // the score value itself
    expect(json).not.toContain("HADDAD");
    expect(json).not.toContain("123456");
  });

  it("shows AT_RISK members only QUIET", () => {
    expect(toMemberDto(member).status).toBe("QUIET");
  });

  it("collapses every internal status to the three words", () => {
    expect(toStatusWord("ACTIVE")).toBe("ACTIVE");
    expect(toStatusWord("QUIET")).toBe("QUIET");
    expect(toStatusWord("AT_RISK")).toBe("QUIET");
    expect(toStatusWord("PAUSED")).toBe("PAUSED");
    expect(toStatusWord("DECLINED")).toBe("PAUSED");
    expect(toStatusWord("SUSPENDED")).toBe("PAUSED");
    expect(toStatusWord("INACTIVE")).toBe("PAUSED");
  });
});

const event = {
  id: "e_1",
  name: "SERENA",
  index: "001",
  slug: "serena",
  city: "BEIRUT",
  startsAt: new Date("2026-09-05T21:00:00Z"),
  endsAt: new Date("2026-09-06T02:00:00Z"),
  timezone: "Asia/Beirut",
  venueName: "SECRET WAREHOUSE",
  venueAddress: "Rue X, Karantina",
  venueNotes: "side door",
  venueRevealAt: new Date("2026-09-04T21:00:00Z"),
  status: "INVITING",
  capacityTotal: 120,
  capacityRoses: 80,
  capacityStems: 40,
  rsvpOpensAt: new Date("2026-08-28T00:00:00Z"),
  rsvpDeadline: new Date("2026-09-04T00:00:00Z"),
  stemsAllowed: true,
  stemPriceCents: 5000,
  stemCurrency: "USD",
  editionMark: "thorn",
  tablesEnabled: true,
  tablesRemovedAtLocal: "01:00",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as Event;

describe("event dto", () => {
  it("never carries the venue before venueRevealAt", () => {
    const before = JSON.stringify(toEventDto(event, new Date("2026-09-03T00:00:00Z")));
    expect(before).not.toContain("WAREHOUSE");
    expect(before).not.toContain("Karantina");
    expect(before).not.toContain("side door");
  });

  it("reveals the venue after venueRevealAt, never the notes", () => {
    const after = toEventDto(event, new Date("2026-09-04T22:00:00Z"));
    expect(after.venue?.name).toBe("SECRET WAREHOUSE");
    expect(JSON.stringify(after)).not.toContain("side door");
  });
});
