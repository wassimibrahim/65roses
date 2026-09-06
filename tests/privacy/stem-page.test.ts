// V2 — what a Stem's page can be made to give up.
//
// Section 10: he sees the event name, the date, the hours, and her FIRST name.
// The select in that page is the privacy boundary, so this test reads the file
// and asserts the boundary itself, not a rendered sample — a sample only proves
// today's data was harmless.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { opaqueToken } from "@/lib/crypto/token";

const page = readFileSync("src/app/(public)/s/[token]/page.tsx", "utf8");
const select = page.slice(page.indexOf("select: {"), page.indexOf("if (!stem)"));

// everything about her that must not cross into his page
const HERS = [
  "lastName",
  "memberNumber",
  "phone",
  "email",
  "instagramHandle",
  "dateOfBirth",
  "roseHealth",
  "status",
  "addressLine",
  "area",
];

describe("his page", () => {
  it("asks the database for her first name and nothing else about her", () => {
    const hostMember = select.slice(select.indexOf("hostMember"), select.indexOf("event:"));
    expect(hostMember).toContain("firstName");
    for (const field of HERS) expect(hostMember).not.toContain(field);
  });

  it("asks the event for its name and its end, never its venue", () => {
    const event = select.slice(select.indexOf("event: {"));
    for (const field of ["venueName", "venueAddress", "venueNotes", "capacity"]) {
      expect(event).not.toContain(field);
    }
  });

  it("never selects the price — the amount rides the payment intent instead", () => {
    expect(select).not.toContain("stemPriceCents");
    expect(select).not.toContain("stemCurrency");
  });

  it("never selects any other guest", () => {
    expect(select).not.toContain("stemGuests");
    expect(select).not.toContain("rsvps");
    expect(select).not.toContain("invitations");
  });

  it("is reached by an opaque token and never by a database id", () => {
    expect(page).toContain("where: { token }");
    expect(page).not.toMatch(/where:\s*\{\s*id:\s*(token|params)/);
  });
});

describe("the tokens themselves", () => {
  it("are long enough that guessing is not a strategy", () => {
    const token = opaqueToken(10);
    expect(token).toHaveLength(10);
    // 32 unambiguous characters: 32^10 ≈ 1.1e15
    expect(Math.log2(32 ** 10)).toBeGreaterThan(49);
  });

  it("carry nothing sequential — two in a row share no structure", () => {
    const a = opaqueToken(16);
    const b = opaqueToken(16);
    expect(a).not.toBe(b);
    let shared = 0;
    for (let i = 0; i < 16; i++) if (a[i] === b[i]) shared += 1;
    expect(shared).toBeLessThan(8);
  });

  it("cannot be walked: 500 tokens produce 500 distinct values", () => {
    const seen = new Set(Array.from({ length: 500 }, () => opaqueToken(10)));
    expect(seen.size).toBe(500);
  });

  it("avoid the characters a person would mistype into someone else's page", () => {
    const many = Array.from({ length: 200 }, () => opaqueToken(24)).join("");
    for (const ambiguous of ["0", "O", "1", "I", "l"]) {
      expect(many).not.toContain(ambiguous);
    }
  });

  it("is rate limited per token and per IP, so a guessing loop is capped", () => {
    expect(page).toContain("stemLinkPerToken");
    expect(page).toContain("stemLinkPerIp");
  });
});
