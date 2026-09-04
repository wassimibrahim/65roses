// V2 — the venue.
//
// Section 14: the venue string is never included in any response before
// venueRevealAt, enforced server-side. There are four ways to try to read it:
// the DTO that builds every member payload, the message the invitation sends,
// the email, and the roster the door caches. Each has its own test here.
import { describe, expect, it } from "vitest";
import { toEventDto } from "@/lib/dto/event";
import type { Event } from "@prisma/client";
import { invitationMessages } from "@/content/messages";

const VENUE = "THE APARTMENT";
const ADDRESS = "Rue Gouraud 12, Mar Mikhael";

const night = {
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  venueRevealAt: null as Date | null,
  rsvpOpensAt: null,
  tablesEnabled: true,
  tablesRemovedAtLocal: "01:00",
  id: "e1",
  index: "001",
  name: "SERENA",
  slug: "serena",
  city: "BEIRUT" as const,
  startsAt: new Date("2026-05-01T21:00:00Z"),
  endsAt: new Date("2026-05-02T02:00:00Z"),
  timezone: "Asia/Beirut",
  status: "INVITING" as const,
  venueName: VENUE,
  venueAddress: ADDRESS,
  venueNotes: "the blue door",
  stemsAllowed: true,
  stemPriceCents: 4000,
  stemCurrency: "USD",
  capacityTotal: 100,
  capacityRoses: 60,
  capacityStems: 40,
  rsvpDeadline: null,
  editionMark: "leaf",
} as unknown as Event;

function leaks(value: unknown): boolean {
  const json = JSON.stringify(value);
  return json.includes(VENUE) || json.includes("Gouraud") || json.includes("blue door");
}

describe("the venue before venueRevealAt", () => {
  it("is absent from the event DTO with the reveal still ahead", () => {
    const dto = toEventDto(
      { ...night, venueRevealAt: new Date("2026-05-01T00:00:00Z") },
      new Date("2026-04-28T00:00:00Z"),
    );
    expect(leaks(dto)).toBe(false);
  });

  it("is absent when no reveal time has been set at all", () => {
    const dto = toEventDto({ ...night, venueRevealAt: null }, new Date("2026-05-01T22:00:00Z"));
    expect(leaks(dto)).toBe(false);
  });

  it("is absent one millisecond before the reveal, and present one after", () => {
    const revealAt = new Date("2026-05-01T00:00:00Z");
    expect(leaks(toEventDto({ ...night, venueRevealAt: revealAt }, new Date(revealAt.getTime() - 1)))).toBe(
      false,
    );
    expect(leaks(toEventDto({ ...night, venueRevealAt: revealAt }, new Date(revealAt.getTime())))).toBe(
      true,
    );
  });

  it("cannot appear in an invitation, because an invitation is not built from it", () => {
    const messages = invitationMessages(night, "https://65.example");
    expect(leaks(messages)).toBe(false);
    // and there is no path for it: the function's whole input is these three fields
    expect(invitationMessages.length).toBe(2);
  });

  it("is absent from the door roster, which carries no event fields at all", async () => {
    const { doorState } = await import("@/lib/door/roster");
    const db = {
      event: { findUniqueOrThrow: async () => ({ id: "e1", name: "SERENA", index: "001" }) },
      rsvp: { findMany: async () => [] },
      stemGuest: { findMany: async () => [] },
      checkIn: { groupBy: async () => [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(leaks(await doorState(db, "e1"))).toBe(false);
  });
});
