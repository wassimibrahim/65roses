// V2 — grinding at a short code until it opens.
//
// A 6-digit OTP and a 4-digit door code are both small enough to walk through
// by hand given enough tries. Neither is defended by its length; both are
// defended by an attempt counter, a window, and a pepper the attacker does not
// have. These tests are the proof that those three are actually wired up.
import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { consume, presets } from "@/lib/rate-limit";
import { wrongCodeLimit } from "@/lib/door/entry";

beforeAll(() => {
  process.env.CODE_HASH_PEPPER ??= randomBytes(32).toString("base64");
});

function memoryDb() {
  const rows = new Map<string, { key: string; count: number; windowEnd: Date }>();
  return {
    rateLimit: {
      findUnique: async ({ where }: { where: { key: string } }) => rows.get(where.key) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { key: string };
        create: { key: string; count: number; windowEnd: Date };
        update: { count?: number | { increment: number }; windowEnd?: Date };
      }) => {
        const existing = rows.get(where.key);
        if (!existing) {
          rows.set(where.key, { ...create });
          return create;
        }
        if (typeof update.count === "number") existing.count = update.count;
        else if (update.count) existing.count += update.count.increment;
        if (update.windowEnd) existing.windowEnd = update.windowEnd;
        return existing;
      },
    },
  };
}

describe("an OTP under attack", () => {
  it("gives one phone three tries in fifteen minutes, not six hundred", async () => {
    const db = memoryDb();
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push((await consume(db, presets.otpPerPhone, "+9613123456")).allowed);
    }
    expect(results.filter(Boolean)).toHaveLength(presets.otpPerPhone.limit);
    expect(presets.otpPerPhone.limit).toBeLessThanOrEqual(5);
  });

  it("is limited per IP as well, so a thousand phones from one machine is capped", async () => {
    const db = memoryDb();
    let allowed = 0;
    for (let i = 0; i < 50; i++) {
      if ((await consume(db, presets.otpPerIp, "203.0.113.9")).allowed) allowed += 1;
    }
    expect(allowed).toBe(presets.otpPerIp.limit);
  });

  it("counts each phone separately, so one Rose cannot lock out another", async () => {
    const db = memoryDb();
    for (let i = 0; i < 10; i++) await consume(db, presets.otpPerPhone, "+9613111111");
    expect((await consume(db, presets.otpPerPhone, "+9613222222")).allowed).toBe(true);
  });

  it("reopens only after the window, never on the next request", async () => {
    const db = memoryDb();
    const start = new Date("2026-05-01T00:00:00Z");
    for (let i = 0; i < 10; i++) await consume(db, presets.otpPerPhone, "+9613123456", start);
    const midway = new Date(start.getTime() + presets.otpPerPhone.windowMs - 1000);
    expect((await consume(db, presets.otpPerPhone, "+9613123456", midway)).allowed).toBe(false);
    const after = new Date(start.getTime() + presets.otpPerPhone.windowMs + 1000);
    expect((await consume(db, presets.otpPerPhone, "+9613123456", after)).allowed).toBe(true);
  });
});

describe("a door code under attack", () => {
  it("gives three tries a minute against one record", async () => {
    const db = memoryDb();
    const results = [];
    for (let i = 0; i < 10; i++) results.push((await consume(db, wrongCodeLimit, "rsvp1")).allowed);
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(wrongCodeLimit.windowMs).toBe(60_000);
  });

  it("caps a full walk of the 4-digit space at hours, not seconds", () => {
    const perMinute = wrongCodeLimit.limit;
    const minutesToExhaust = 10_000 / perMinute;
    expect(minutesToExhaust).toBeGreaterThan(60 * 24);
  });

  it("cannot be walked offline: without the pepper the candidates are not computable", async () => {
    const { hashCode } = await import("@/lib/crypto/hash");
    const pepper = process.env.CODE_HASH_PEPPER;

    const stored = hashCode("4821", "door:e1:rose:m1");
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain("4821");

    // an attacker holding the database but not the pepper computes the whole
    // 4-digit space and matches nothing
    process.env.CODE_HASH_PEPPER = randomBytes(32).toString("base64");
    const guesses = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      guesses.add(hashCode(String(i).padStart(4, "0"), "door:e1:rose:m1"));
    }
    expect(guesses.has(stored)).toBe(false);

    // and with the pepper, exactly one of the ten thousand matches
    process.env.CODE_HASH_PEPPER = pepper;
    let hits = 0;
    for (let i = 0; i < 10_000; i++) {
      if (hashCode(String(i).padStart(4, "0"), "door:e1:rose:m1") === stored) hits += 1;
    }
    expect(hits).toBe(1);
  });
});
