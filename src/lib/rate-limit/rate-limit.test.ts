// rate-limit: allows within the window, blocks past the limit, resets after the window
import { describe, expect, it } from "vitest";
import { consume, presets, type RateLimitDb } from "./index";

function fakeDb(): RateLimitDb {
  const rows = new Map<string, { key: string; count: number; windowEnd: Date }>();
  return {
    rateLimit: {
      async findUnique({ where }) {
        return rows.get(where.key) ?? null;
      },
      async upsert({ where, create, update }) {
        const existing = rows.get(where.key);
        if (!existing) {
          rows.set(where.key, { ...create });
          return { count: create.count, windowEnd: create.windowEnd };
        }
        if (typeof update.count === "object" && update.count) {
          existing.count += update.count.increment;
        } else if (typeof update.count === "number") {
          existing.count = update.count;
        }
        if (update.windowEnd) existing.windowEnd = update.windowEnd;
        return { count: existing.count, windowEnd: existing.windowEnd };
      },
    },
  };
}

describe("rate limit", () => {
  it("allows up to the limit then blocks", async () => {
    const db = fakeDb();
    const now = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < presets.otpPerPhone.limit; i++) {
      expect((await consume(db, presets.otpPerPhone, "+9613123456", now)).allowed).toBe(true);
    }
    expect((await consume(db, presets.otpPerPhone, "+9613123456", now)).allowed).toBe(false);
  });

  it("keys are isolated from each other", async () => {
    const db = fakeDb();
    const now = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < presets.otpPerPhone.limit + 1; i++) {
      await consume(db, presets.otpPerPhone, "+9613111111", now);
    }
    expect((await consume(db, presets.otpPerPhone, "+9613222222", now)).allowed).toBe(true);
  });

  it("resets when the window ends", async () => {
    const db = fakeDb();
    const start = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < presets.otpPerPhone.limit + 2; i++) {
      await consume(db, presets.otpPerPhone, "+9613123456", start);
    }
    const later = new Date(start.getTime() + presets.otpPerPhone.windowMs + 1000);
    expect((await consume(db, presets.otpPerPhone, "+9613123456", later)).allowed).toBe(true);
  });
});
