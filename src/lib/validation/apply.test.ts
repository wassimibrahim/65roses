// the application boundary: normalization, 18+, honeypot shape
import { describe, expect, it } from "vitest";
import { applySchema, isAdult, normalizeInstagram, normalizePhone } from "./apply";

const valid = {
  firstName: "Serena",
  lastName: "Haddad",
  instagram: "@Serena.Haddad",
  email: "SERENA@example.com",
  mobile: "03 123 456",
  dateOfBirth: "2000-01-01",
  area: "Mar Mikhael",
  howFound: "",
  knowARose: "0065",
  consents: { adult: true, houseRules: true, messaging: true, privacy: true },
  website: "",
  startedAt: Date.now(),
};

describe("apply validation", () => {
  it("accepts a valid application and normalizes it", () => {
    const parsed = applySchema.parse(valid);
    expect(parsed.instagram).toBe("serena.haddad"); // stored without the @
    expect(parsed.email).toBe("serena@example.com");
    expect(parsed.mobile).toBe("+9613123456"); // Lebanese default, E.164
  });

  it("rejects a missing consent", () => {
    expect(
      applySchema.safeParse({
        ...valid,
        consents: { ...valid.consents, houseRules: false },
      }).success,
    ).toBe(false);
  });

  it("rejects an under-18 date of birth", () => {
    const seventeenYearsAgo = new Date();
    seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
    expect(
      applySchema.safeParse({ ...valid, dateOfBirth: seventeenYearsAgo.toISOString() }).success,
    ).toBe(false);
  });

  it("rejects an unparseable phone", () => {
    expect(applySchema.safeParse({ ...valid, mobile: "hello" }).success).toBe(false);
  });

  it("accepts an already-international phone", () => {
    expect(applySchema.parse({ ...valid, mobile: "+34 612 345 678" }).mobile).toBe("+34612345678");
  });

  it("keeps the honeypot field empty-only", () => {
    expect(applySchema.safeParse({ ...valid, website: "https://spam" }).success).toBe(false);
  });

  it("isAdult is exact on the birthday", () => {
    const now = new Date("2026-08-17T12:00:00Z");
    expect(isAdult(new Date("2008-08-17"), now)).toBe(true);
    expect(isAdult(new Date("2008-08-18"), now)).toBe(false);
  });

  it("normalizes instagram handles", () => {
    expect(normalizeInstagram("@@Rose.65")).toBe("rose.65");
    expect(normalizePhone("70123456")).toBe("+96170123456");
  });
});
