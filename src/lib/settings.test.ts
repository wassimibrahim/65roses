import { describe, expect, it } from "vitest";
import { getSetting, mayReceiveCircleLink, SETTING_KEYS, setSetting } from "./settings";
import type { Db } from "@/lib/db/client";

describe("who may be handed a circle link", () => {
  it("an ACTIVE Rose with a verified phone", () => {
    expect(mayReceiveCircleLink({ status: "ACTIVE", phoneVerified: true })).toBe(true);
  });

  it.each(["QUIET", "AT_RISK", "PAUSED", "SUSPENDED", "DECLINED", "INACTIVE"])(
    "not a %s one — and she is told nothing about why",
    (status) => {
      expect(mayReceiveCircleLink({ status, phoneVerified: true })).toBe(false);
    },
  );

  it("not before her phone has answered", () => {
    expect(mayReceiveCircleLink({ status: "ACTIVE", phoneVerified: false })).toBe(false);
  });
});

describe("settings", () => {
  function fakeDb(stored: Record<string, string>) {
    const writes: { key: string; value: string }[] = [];
    return {
      writes,
      db: {
        setting: {
          findUnique: async ({ where }: { where: { key: string } }) =>
            stored[where.key] ? { value: stored[where.key] } : null,
          upsert: async ({ create }: { create: { key: string; value: string } }) => {
            writes.push(create);
            return create;
          },
        },
      } as unknown as Db,
    };
  }

  it("prefers the stored value over the environment", async () => {
    process.env.CIRCLE_LINK_ROSES = "https://example.test/from-env";
    const { db } = fakeDb({ [SETTING_KEYS.circleRoses]: "https://example.test/rotated" });
    expect(await getSetting(db, SETTING_KEYS.circleRoses)).toBe("https://example.test/rotated");
  });

  it("falls back to the environment before anyone has opened the atelier", async () => {
    process.env.CIRCLE_LINK_ROSES = "https://example.test/from-env";
    const { db } = fakeDb({});
    expect(await getSetting(db, SETTING_KEYS.circleRoses)).toBe("https://example.test/from-env");
  });

  it("answers with nothing rather than a guess when neither is set", async () => {
    delete process.env.CIRCLE_LINK_ROSES;
    const { db } = fakeDb({});
    expect(await getSetting(db, SETTING_KEYS.circleRoses)).toBeNull();
  });

  it("keeps the two groups apart", async () => {
    const { db, writes } = fakeDb({});
    await setSetting(db, SETTING_KEYS.circleAnnouncements, "https://example.test/a", "owner");
    expect(writes[0]?.key).toBe(SETTING_KEYS.circleAnnouncements);
    expect(SETTING_KEYS.circleAnnouncements).not.toBe(SETTING_KEYS.circleRoses);
  });
});
