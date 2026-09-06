// The role matrix, asserted rather than remembered.
//
// DOOR is the interesting row: a host's phone is the least protected device in
// the world — it is passed around in a dark room — so a DOOR session reaches
// the door and nothing else. And it is refused with a 404, never a 403: we do
// not confirm that /atelier exists to someone who should not know.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@prisma/client";

const session = vi.hoisted(() => ({ current: null as { user?: unknown } | null }));

vi.mock("@/lib/auth", () => ({ auth: async () => session.current }));
vi.mock("server-only", () => ({}));

const { AuthError, requireAdmin, requireDoor, requireMember, requireOwner } = await import(
  "./guards"
);

function signedInAs(role: Role, email = "person@example.com") {
  session.current = {
    user: { id: "u1", email, role, phoneVerified: true, memberId: "m1" },
  };
}

async function verdict(guard: () => Promise<unknown>): Promise<"OK" | "FORBIDDEN" | "UNAUTH"> {
  try {
    await guard();
    return "OK";
  } catch (err) {
    if (err instanceof AuthError) return err.code === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTH";
    throw err;
  }
}

beforeEach(() => {
  session.current = null;
  process.env.ATELIER_ALLOWLIST = "owner@example.com,admin@example.com";
});

describe("the role matrix", () => {
  it("a signed-out visitor is unauthenticated everywhere", async () => {
    expect(await verdict(requireMember)).toBe("UNAUTH");
    expect(await verdict(requireDoor)).toBe("UNAUTH");
    expect(await verdict(requireAdmin)).toBe("UNAUTH");
    expect(await verdict(requireOwner)).toBe("UNAUTH");
  });

  it("a DOOR session reaches the door and nothing else", async () => {
    signedInAs("DOOR", "door@example.com");
    expect(await verdict(requireDoor)).toBe("OK");
    expect(await verdict(requireMember)).toBe("FORBIDDEN");
    expect(await verdict(requireAdmin)).toBe("FORBIDDEN");
    expect(await verdict(requireOwner)).toBe("FORBIDDEN");
  });

  it("a MEMBER session reaches her pages and neither staff surface", async () => {
    signedInAs("MEMBER", "rose@example.com");
    expect(await verdict(requireMember)).toBe("OK");
    expect(await verdict(requireDoor)).toBe("FORBIDDEN");
    expect(await verdict(requireAdmin)).toBe("FORBIDDEN");
    expect(await verdict(requireOwner)).toBe("FORBIDDEN");
  });

  it("an ADMIN reaches the atelier but not what is owner-only", async () => {
    signedInAs("ADMIN", "admin@example.com");
    expect(await verdict(requireAdmin)).toBe("OK");
    expect(await verdict(requireDoor)).toBe("OK");
    expect(await verdict(requireOwner)).toBe("FORBIDDEN");
  });

  it("an OWNER reaches everything", async () => {
    signedInAs("OWNER", "owner@example.com");
    expect(await verdict(requireOwner)).toBe("OK");
    expect(await verdict(requireAdmin)).toBe("OK");
    expect(await verdict(requireDoor)).toBe("OK");
  });

  it("the atelier carries a second lock: the role is not enough", async () => {
    // the right role, an email nobody put on the list
    signedInAs("OWNER", "stranger@example.com");
    expect(await verdict(requireAdmin)).toBe("FORBIDDEN");
    expect(await verdict(requireOwner)).toBe("FORBIDDEN");
    // and the door, which the allowlist does not govern, still opens
    expect(await verdict(requireDoor)).toBe("OK");
  });

  it("an empty allowlist locks the atelier rather than opening it", async () => {
    process.env.ATELIER_ALLOWLIST = "";
    signedInAs("OWNER", "owner@example.com");
    expect(await verdict(requireAdmin)).toBe("FORBIDDEN");
  });

  it("matches the allowlist without caring about case or spacing", async () => {
    process.env.ATELIER_ALLOWLIST = " Owner@Example.com , admin@example.com ";
    signedInAs("OWNER", "OWNER@example.COM");
    expect(await verdict(requireAdmin)).toBe("OK");
  });
});
