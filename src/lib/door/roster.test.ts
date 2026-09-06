// What reaches a phone at the door, and nothing else. This test is the fence.
import { describe, expect, it } from "vitest";
import { doorState } from "./roster";
import type { Db } from "@/lib/db/client";

const FORBIDDEN = [
  "email",
  "instagram",
  "instagramHandle",
  "addressLine",
  "roseHealth",
  "dateOfBirth",
  "eventsNoShow",
  "doorCodeHash",
  "venueAddress",
  "relationshipNote",
  "note",
];

const db = {
  event: {
    findUniqueOrThrow: async () => ({ id: "e1", name: "SERENA", index: "001" }),
  },
  rsvp: {
    findMany: async () => [
      {
        id: "r1",
        response: "CONFIRMED",
        checkInId: "c1",
        checkIn: { enteredAt: new Date("2026-05-02T00:20:00Z") },
        member: {
          firstName: "Serena",
          lastName: "Haddad",
          memberNumber: "0065",
          phone: "+9613123456",
          status: "ACTIVE",
        },
      },
      {
        id: "r2",
        response: "NO_RESPONSE",
        checkInId: null,
        checkIn: null,
        member: {
          firstName: "Talia",
          lastName: "Rizk",
          memberNumber: "0066",
          phone: "+9613987654",
          status: "PAUSED",
        },
      },
    ],
  },
  checkIn: {
    // one Rose from the roster, plus a walk-in who has no roster row at all
    groupBy: async () => [{ subject: "ROSE", _count: { _all: 2 } }],
  },
  stemGuest: {
    findMany: async () => [
      {
        id: "s1",
        firstName: "Karim",
        lastName: "Aoun",
        phone: "+9613555111",
        paymentStatus: "PAID",
        checkIn: null,
        credential: { braceletSerial: "B-0012", editionMark: "leaf" },
        hostMember: { memberNumber: "0065" },
      },
    ],
  },
} as unknown as Db;

describe("the door roster", () => {
  it("carries only what a host needs to recognise a person", async () => {
    const state = await doorState(db, "e1");
    const serialized = JSON.stringify(state);
    for (const key of FORBIDDEN) expect(serialized).not.toContain(key);
  });

  it("never carries a whole phone number — four digits is what a host is given", async () => {
    const state = await doorState(db, "e1");
    expect(JSON.stringify(state)).not.toContain("+9613123456");
    expect(state.roster[0]?.last4).toBe("3456");
  });

  it("counts the room, not the list — a walk-in is a person standing inside", async () => {
    const state = await doorState(db, "e1");
    expect(state.counts).toEqual({ roses: 2, stems: 0, total: 2 });
    expect(state.roster.filter((r) => r.inside)).toHaveLength(1);
  });

  it("marks a paused Rose for a host without saying why", async () => {
    const state = await doorState(db, "e1");
    const paused = state.roster.find((r) => r.memberNumber === "0066");
    expect(paused?.askAHost).toBe(true);
    expect(JSON.stringify(paused)).not.toContain("PAUSED");
  });

  it("shows his bracelet and the number of the Rose he is with, never her name", async () => {
    const state = await doorState(db, "e1");
    const stem = state.roster.find((r) => r.subject === "STEM");
    expect(stem?.bracelet).toBe("B-0012");
    expect(stem?.memberNumber).toBe("0065");
    expect(JSON.stringify(stem)).not.toContain("Serena");
  });
});
