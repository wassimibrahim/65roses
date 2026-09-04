import { describe, expect, it } from "vitest";
import { normalizeUid, resolveNfc } from "./nfc";
import type { Db } from "@/lib/db/client";

const UID = "04A2B3C4D5E680";

function fakeDb(over: {
  rose?: { memberId: string; status: string } | null;
  rsvp?: { id: string } | null;
  stem?: { stemGuestId: string; eventId: string; status: string; validTo: Date } | null;
}) {
  return {
    roseCredential: { findUnique: async () => over.rose ?? null },
    rsvp: { findFirst: async () => over.rsvp ?? null },
    stemCredential: { findUnique: async () => over.stem ?? null },
  } as unknown as Db;
}

const future = new Date(Date.now() + 3600_000);
const past = new Date(Date.now() - 3600_000);

describe("normalizeUid", () => {
  it("accepts however a reader spells it", () => {
    expect(normalizeUid("04:a2:b3:c4:d5:e6:80")).toBe(UID);
    expect(normalizeUid(" 04a2b3c4d5e680 ")).toBe(UID);
    expect(normalizeUid("04-A2-B3-C4-D5-E6-80")).toBe(UID);
  });
});

describe("resolveNfc", () => {
  it("finds the Rose whose tag it is, on the night she is on the list for", async () => {
    const db = fakeDb({
      rose: { memberId: "m1", status: "ACTIVE" },
      rsvp: { id: "rsvp1" },
    });
    expect(await resolveNfc(db, UID, "e1")).toEqual({ subject: "ROSE", id: "rsvp1" });
  });

  it("resolves nothing for a Rose who is not on tonight's list", async () => {
    const db = fakeDb({ rose: { memberId: "m1", status: "ACTIVE" }, rsvp: null });
    expect(await resolveNfc(db, UID, "e1")).toBeNull();
  });

  it("ignores a revoked or lost Rose tag", async () => {
    for (const status of ["REVOKED", "LOST"]) {
      const db = fakeDb({ rose: { memberId: "m1", status }, rsvp: { id: "rsvp1" } });
      expect(await resolveNfc(db, UID, "e1")).toBeNull();
    }
  });

  it("finds a Stem's bracelet on its own night", async () => {
    const db = fakeDb({
      stem: { stemGuestId: "s1", eventId: "e1", status: "ACTIVE", validTo: future },
    });
    expect(await resolveNfc(db, UID, "e1")).toEqual({ subject: "STEM", id: "s1" });
  });

  it("refuses a bracelet from another night — old bracelets die", async () => {
    const db = fakeDb({
      stem: { stemGuestId: "s1", eventId: "e-other", status: "ACTIVE", validTo: future },
    });
    expect(await resolveNfc(db, UID, "e1")).toBeNull();
  });

  it("refuses an expired bracelet even on the right night", async () => {
    const db = fakeDb({
      stem: { stemGuestId: "s1", eventId: "e1", status: "ACTIVE", validTo: past },
    });
    expect(await resolveNfc(db, UID, "e1")).toBeNull();
  });

  it("refuses a uid too short to be a tag, without touching the database", async () => {
    const db = {
      roseCredential: {
        findUnique: async () => {
          throw new Error("should not be reached");
        },
      },
    } as unknown as Db;
    expect(await resolveNfc(db, "0401", "e1")).toBeNull();
  });

  it("returns a person, never a verdict — the shape carries no way to say IN", async () => {
    const db = fakeDb({ rose: { memberId: "m1", status: "ACTIVE" }, rsvp: { id: "rsvp1" } });
    const match = await resolveNfc(db, UID, "e1");
    expect(Object.keys(match ?? {}).sort()).toEqual(["id", "subject"]);
  });
});
