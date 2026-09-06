// V2 — her right to a copy, and her right to be gone.
//
// Section 11 requires both from Phase 1. The erasure test is the important one:
// it asserts what survives as carefully as what goes, because an erasure that
// quietly keeps a name is worse than one that admits it.
import { describe, expect, it } from "vitest";
import { eraseSubject, exportSubjectData } from "@/lib/privacy/subject-data";
import type { Db } from "@/lib/db/client";

const row = {
  memberNumber: "0065",
  firstName: "Serena",
  lastName: "Haddad",
  instagramHandle: "serena.h",
  phone: "+9613123456",
  phoneVerified: true,
  dateOfBirth: new Date("1996-03-03"),
  city: "BEIRUT",
  area: "Mar Mikhael",
  status: "ACTIVE",
  foundingRose: true,
  communityStatus: "JOINED",
  createdAt: new Date(),
  user: { email: "serena@example.com", createdAt: new Date(), lastLoginAt: null },
  application: { firstName: "Serena", consentIp: "203.0.113.9" },
  deliveryAddress: { addressLine: "Rue Gouraud 12", notes: "blue door" },
  roseCredential: { engravedNumber: "0065", serial: "S-0065" },
  invitations: [{ status: "RESPONDED" }],
  stemGuests: [{ firstName: "Karim" }],
  checkIns: [{ verifyMethod: "OTP" }],
  roseDeliveries: [{ status: "DELIVERED" }],
  messages: [{ toRedacted: "•••••456" }],
  referralsMade: [{ instagramHandle: "lea.nakhle" }],
};

describe("her copy of her data", () => {
  it("carries her address and her whole number — it is hers, and it is going to her", async () => {
    const db = {
      memberProfile: { findUnique: async () => row },
      payment: { findMany: async () => [{ amountCents: 4000 }] },
    } as unknown as Db;

    const data = await exportSubjectData(db, "m1");
    const json = JSON.stringify(data);
    expect(json).toContain("+9613123456");
    expect(json).toContain("Rue Gouraud 12");
    expect(json).toContain("blue door");
  });

  it("includes every table that holds something about her", async () => {
    const db = {
      memberProfile: { findUnique: async () => row },
      payment: { findMany: async () => [] },
    } as unknown as Db;
    const data = await exportSubjectData(db, "m1");
    for (const section of [
      "member",
      "application",
      "address",
      "rose",
      "nights",
      "stems",
      "arrivals",
      "deliveries",
      "messages",
      "payments",
      "referralsMade",
    ]) {
      expect(data).toHaveProperty(section);
    }
  });

  it("does not hand her the operational judgement made about her", async () => {
    const db = {
      memberProfile: { findUnique: async () => row },
      payment: { findMany: async () => [] },
    } as unknown as Db;
    const json = JSON.stringify(await exportSubjectData(db, "m1"));
    expect(json).not.toContain("roseHealth");
  });

  it("answers nothing for a member who is not there", async () => {
    const db = {
      memberProfile: { findUnique: async () => null },
      payment: { findMany: async () => [] },
    } as unknown as Db;
    expect(await exportSubjectData(db, "gone")).toBeNull();
  });
});

describe("erasure", () => {
  function recordingDb() {
    const writes: { table: string; op: string; data: Record<string, unknown> }[] = [];
    const table = (name: string) => ({
      update: async ({ data }: { data: Record<string, unknown> }) => {
        writes.push({ table: name, op: "update", data });
        return {};
      },
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        writes.push({ table: name, op: "updateMany", data });
        return {};
      },
      deleteMany: async () => {
        writes.push({ table: name, op: "deleteMany", data: {} });
        return {};
      },
    });
    const tx = {
      deliveryAddress: table("deliveryAddress"),
      referral: table("referral"),
      stemGuest: table("stemGuest"),
      memberProfile: table("memberProfile"),
      application: table("application"),
      session: table("session"),
      user: table("user"),
      // these must never be written to by an erasure
      auditLog: {
        deleteMany: async () => {
          throw new Error("an erasure must not touch the trail");
        },
        update: async () => {
          throw new Error("an erasure must not touch the trail");
        },
      },
      payment: {
        deleteMany: async () => {
          throw new Error("an erasure must not delete financial records");
        },
      },
      roseCredential: {
        deleteMany: async () => {
          throw new Error("her Rose is hers; leaving does not make it ours");
        },
        update: async () => {
          throw new Error("her Rose is hers; leaving does not make it ours");
        },
      },
    };
    return {
      writes,
      db: {
        memberProfile: {
          findUnique: async () => ({
            id: "m1",
            memberNumber: "0065",
            userId: "u1",
            applicationId: "a1",
          }),
          ...table("memberProfile"),
        },
        $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
      } as unknown as Db,
    };
  }

  it("removes every field that is about a person", async () => {
    const { db, writes } = recordingDb();
    const result = await eraseSubject(db, "m1");
    expect(result?.memberNumber).toBe("0065");

    const profile = writes.find((w) => w.table === "memberProfile" && w.op === "update")!.data;
    expect(profile.firstName).toBe("—");
    expect(profile.lastName).toBe("—");
    expect(profile.area).toBeNull();
    expect(String(profile.phone)).toMatch(/^erased-/);
    expect(String(profile.instagramHandle)).toMatch(/^erased-/);
    expect(profile.deletedAt).toBeInstanceOf(Date);

    const application = writes.find((w) => w.table === "application")!.data;
    expect(application.consentIp).toBeNull();
    expect(application.welcomeToken).toBeNull();
    expect(String(application.email)).toContain("@erased.invalid");

    const user = writes.find((w) => w.table === "user")!.data;
    expect(user.passwordHash).toBeNull();
    expect(String(user.email)).toContain("@erased.invalid");
  });

  it("deletes her address outright rather than blanking it", async () => {
    const { db, writes } = recordingDb();
    await eraseSubject(db, "m1");
    expect(writes).toContainEqual({ table: "deliveryAddress", op: "deleteMany", data: {} });
  });

  it("clears the free text she wrote about other people", async () => {
    const { db, writes } = recordingDb();
    await eraseSubject(db, "m1");
    expect(writes.find((w) => w.table === "referral")!.data.note).toBeNull();
    expect(writes.find((w) => w.table === "stemGuest")!.data.relationshipNote).toBeNull();
  });

  it("revokes her sessions, so the erasure takes effect on the next request", async () => {
    const { db, writes } = recordingDb();
    await eraseSubject(db, "m1");
    expect(writes.find((w) => w.table === "session")!.data.revokedAt).toBeInstanceOf(Date);
  });

  it("touches neither the trail, nor the payments, nor her Rose — the fakes throw if it does", async () => {
    const { db } = recordingDb();
    await expect(eraseSubject(db, "m1")).resolves.toMatchObject({ memberNumber: "0065" });
  });

  it("retires her number rather than freeing it for someone else", async () => {
    const { db, writes } = recordingDb();
    await eraseSubject(db, "m1");
    const profile = writes.find((w) => w.table === "memberProfile" && w.op === "update")!.data;
    expect(profile).not.toHaveProperty("memberNumber");
  });

  it("locks her out on the next request, not on the next login", async () => {
    const { db, writes } = recordingDb();
    await eraseSubject(db, "m1");
    const profile = writes.find((w) => w.table === "memberProfile" && w.op === "update")!.data;
    // requireVerifiedPhone reads phoneVerified from the database rather than
    // the token, so a session issued a minute ago stops working immediately
    expect(profile.phoneVerified).toBe(false);
    const user = writes.find((w) => w.table === "user")!.data;
    expect(user.deletedAt).toBeInstanceOf(Date);
  });

  it("answers nothing for a member who is already gone", async () => {
    const db = {
      memberProfile: { findUnique: async () => null },
      $transaction: async () => {
        throw new Error("should not reach the transaction");
      },
    } as unknown as Db;
    expect(await eraseSubject(db, "gone")).toBeNull();
  });
});
