import { beforeAll, describe, expect, it } from "vitest";
import {
  checkDoorCode,
  generateDoorCode,
  hashDoorCode,
  isWithinDoorWindow,
  roseCodeContext,
  stemCodeContext,
} from "./code";

beforeAll(() => {
  process.env.CODE_HASH_PEPPER ??= "test-pepper";
});

const HOUR = 60 * 60 * 1000;
const startsAt = new Date("2026-05-01T21:00:00Z");
const endsAt = new Date("2026-05-02T02:00:00Z");
const night = { startsAt, endsAt };

describe("door codes", () => {
  it("is always four digits, leading zeros kept", () => {
    for (let i = 0; i < 500; i++) expect(generateDoorCode()).toMatch(/^\d{4}$/);
  });

  it("opens two hours early and closes an hour late", () => {
    expect(isWithinDoorWindow(night, new Date(startsAt.getTime() - 3 * HOUR))).toBe(false);
    expect(isWithinDoorWindow(night, new Date(startsAt.getTime() - 2 * HOUR))).toBe(true);
    expect(isWithinDoorWindow(night, new Date(endsAt.getTime() + HOUR))).toBe(true);
    expect(isWithinDoorWindow(night, new Date(endsAt.getTime() + HOUR + 1))).toBe(false);
  });

  it("accepts the right code inside the window", () => {
    const ctx = roseCodeContext("evt", "member");
    const record = { doorCodeHash: hashDoorCode("4821", ctx), doorCodeUsedAt: null };
    expect(checkDoorCode("4821", record, ctx, night, startsAt)).toBe("OK");
  });

  it("refuses the right code outside the window", () => {
    const ctx = roseCodeContext("evt", "member");
    const record = { doorCodeHash: hashDoorCode("4821", ctx), doorCodeUsedAt: null };
    const tomorrow = new Date(endsAt.getTime() + 24 * HOUR);
    expect(checkDoorCode("4821", record, ctx, night, tomorrow)).toBe("CLOSED");
  });

  it("is single use", () => {
    const ctx = roseCodeContext("evt", "member");
    const record = { doorCodeHash: hashDoorCode("4821", ctx), doorCodeUsedAt: startsAt };
    expect(checkDoorCode("4821", record, ctx, night, startsAt)).toBe("USED");
  });

  it("a code minted for one night cannot open another", () => {
    const mine = roseCodeContext("evt-001", "member");
    const other = roseCodeContext("evt-002", "member");
    const record = { doorCodeHash: hashDoorCode("4821", mine), doorCodeUsedAt: null };
    expect(checkDoorCode("4821", record, other, night, startsAt)).toBe("WRONG");
  });

  it("her code cannot open his, and his cannot open hers", () => {
    const hers = roseCodeContext("evt", "member");
    const his = stemCodeContext("evt", "stem");
    const record = { doorCodeHash: hashDoorCode("4821", hers), doorCodeUsedAt: null };
    expect(checkDoorCode("4821", record, his, night, startsAt)).toBe("WRONG");
  });

  it("says NOT_ISSUED rather than WRONG when no code was ever minted", () => {
    const ctx = roseCodeContext("evt", "member");
    expect(
      checkDoorCode("4821", { doorCodeHash: null, doorCodeUsedAt: null }, ctx, night, startsAt),
    ).toBe("NOT_ISSUED");
  });

  it("rejects anything that is not four digits", () => {
    const ctx = roseCodeContext("evt", "member");
    const record = { doorCodeHash: hashDoorCode("4821", ctx), doorCodeUsedAt: null };
    for (const bad of ["", "48", "48213", "abcd", "48 21"]) {
      expect(checkDoorCode(bad, record, ctx, night, startsAt)).toBe("WRONG");
    }
  });

  it("never stores the code itself", () => {
    const ctx = roseCodeContext("evt", "member");
    const hash = hashDoorCode("4821", ctx);
    expect(hash).not.toContain("4821");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
