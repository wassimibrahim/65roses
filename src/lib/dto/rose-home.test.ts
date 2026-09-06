// the /rose payload: no roseHealth, no notes, no other member's data — ever
import { describe, expect, it } from "vitest";
import { FORBIDDEN_MEMBER_KEYS } from "./member";
import { getRoseHomeData, type RoseHomeDb } from "./rose-home";

const fakeMember = {
  id: "m_1",
  userId: "u_1",
  applicationId: "a_1",
  memberNumber: "0065",
  firstName: "SERENA",
  lastName: "HADDAD",
  instagramHandle: "serena",
  phone: "+9613123456",
  phoneVerified: true,
  dateOfBirth: new Date("2000-01-01"),
  city: "BEIRUT",
  status: "AT_RISK",
  roseHealth: 22,
  eventsNoShow: 3,
  deletedAt: null,
  invitations: [
    {
      eventId: "e_1",
      invitedAt: new Date(),
      event: {
        id: "e_1",
        index: "001",
        name: "SERENA",
        slug: "serena",
        city: "BEIRUT",
        stemsAllowed: true,
        // fields that must not reach her page payload:
        venueName: "SECRET WAREHOUSE",
        venueAddress: "Karantina",
        capacityRoses: 80,
      },
      rsvp: { response: "CONFIRMED" },
    },
  ],
  stemGuests: [{ firstName: "Karim", eventId: "e_1", lastName: "X", phone: "+96170000000" }],
};

const db: RoseHomeDb = {
  memberProfile: {
    async findUnique() {
      return fakeMember;
    },
  },
};

describe("rose home dto", () => {
  it("carries nothing internal", async () => {
    const data = await getRoseHomeData(db, "m_1");
    const json = JSON.stringify(data);
    for (const key of FORBIDDEN_MEMBER_KEYS) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(json).not.toContain("roseHealth");
    expect(json).not.toContain("HADDAD");
    expect(json).not.toContain("WAREHOUSE");
    expect(json).not.toContain("Karantina");
    expect(json).not.toContain("+9613");
    expect(json).not.toContain("+96170");
  });

  it("maps AT_RISK to QUIET and keeps her stem's first name only", async () => {
    const data = await getRoseHomeData(db, "m_1");
    expect(data?.member.status).toBe("QUIET");
    expect(data?.night?.state).toBe("CONFIRMED");
    expect(data?.night?.stemFirstName).toBe("Karim");
  });
});
