// V2 — reading what belongs to someone else, or what belongs to nobody.
//
// Two claims are tested here. First: roseHealth and its inputs never reach a
// member-facing payload. Second: an authenticated Rose is scoped to herself —
// every member-facing query is keyed by her own memberId from the session, so
// there is no id in a URL to change.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_MEMBER_KEYS, toMemberDto, toStatusWord } from "@/lib/dto/member";
import { getRoseHomeData } from "@/lib/dto/rose-home";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(path)) out.push(path);
  }
  return out;
}

const memberSurfaces = walk("src/app/(member)")
  .concat(walk("src/app/(public)"))
  .filter((f) => !f.includes(".test."));

describe("roseHealth", () => {
  it("is on the forbidden list along with every counter it is computed from", () => {
    for (const key of ["roseHealth", "eventsNoShow", "eventsAttended", "eventsInvited"]) {
      expect(FORBIDDEN_MEMBER_KEYS).toContain(key);
    }
  });

  it("is not selected by any member-facing or public page", () => {
    const offenders = memberSurfaces.filter((f) => readFileSync(f, "utf8").includes("roseHealth"));
    expect(offenders).toEqual([]);
  });

  it("is absent from the DTO even when the row carries it", () => {
    const dto = toMemberDto({
      memberNumber: "0065",
      firstName: "Serena",
      lastName: "Haddad",
      status: "AT_RISK",
      city: "BEIRUT",
      phoneVerified: true,
      roseHealth: 25,
      eventsNoShow: 3,
      phone: "+9613123456",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // key-exact, not substring: phoneVerified is allowed and contains "phone"
    const keys = Object.keys(dto);
    for (const forbidden of FORBIDDEN_MEMBER_KEYS) expect(keys).not.toContain(forbidden);
    expect(keys).toEqual(["memberNumber", "firstName", "status", "city", "phoneVerified"]);
    const json = JSON.stringify(dto);
    expect(json).not.toContain("+9613123456");
    expect(json).not.toContain("Haddad");
  });

  it("cannot be inferred from the status word: AT_RISK reads as QUIET", () => {
    expect(toStatusWord("AT_RISK")).toBe("QUIET");
    expect(toStatusWord("QUIET")).toBe("QUIET");
    // she is never shown the operational label, and never told she is at risk
    for (const status of ["AT_RISK", "SUSPENDED", "DECLINED", "INACTIVE"] as const) {
      expect(["ACTIVE", "QUIET", "PAUSED"]).toContain(toStatusWord(status));
    }
  });

  it("is absent from her whole home payload", async () => {
    const db = {
      memberProfile: {
        findUnique: async () => ({
          memberNumber: "0065",
          firstName: "Serena",
          lastName: "Haddad",
          status: "AT_RISK",
          city: "BEIRUT",
          phoneVerified: true,
          roseHealth: 25,
          eventsNoShow: 3,
          phone: "+9613123456",
          deletedAt: null,
          invitations: [],
          stemGuests: [],
          roseDeliveries: [],
        }),
      },
      subscription: { findUnique: async () => null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const json = JSON.stringify(await getRoseHomeData(db, "m1"));
    expect(json).not.toContain("roseHealth");
    expect(json).not.toContain("AT_RISK");
    expect(json).not.toContain("+9613123456");
    expect(json).not.toContain("Haddad");
    expect(json).toContain("QUIET");
  });
});

describe("reading another Rose", () => {
  it("has no route that takes a member id — her pages are keyed by her session", () => {
    const memberRoutes = walk("src/app/(member)").filter((f) => f.endsWith("page.tsx"));
    const byId = memberRoutes.filter((f) => /\[(memberId|id)\]/.test(f));
    expect(byId).toEqual([]);
  });

  it("resolves the member from the session on every member page, never from a param", () => {
    for (const file of walk("src/app/(member)").filter((f) => f.endsWith("page.tsx"))) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("requireVerifiedPhone");
    }
  });

  it("keys the home query by the id the guard returned", () => {
    const source = readFileSync("src/app/(member)/rose/page.tsx", "utf8");
    expect(source).toContain("const user = await requireVerifiedPhone()");
    expect(source).toContain("memberId = user.memberId");
    expect(source).toContain("getRoseHomeData(prisma, memberId)");
  });
});
