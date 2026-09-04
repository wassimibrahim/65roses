// The rule under test is the one that matters: a lapsed payment is a
// conversation, not a punishment. Nothing here may touch her status or her Rose.
import { describe, expect, it } from "vitest";
import { applySubscriptionEvent, memberSubscriptionLine } from "./subscription";
import type { Db } from "@/lib/db/client";

const soon = new Date(Date.now() + 30 * 24 * 3600_000);
const gone = new Date(Date.now() - 24 * 3600_000);

describe("what she is shown", () => {
  it("nothing at all when there has never been a subscription", () => {
    expect(memberSubscriptionLine(null)).toBeNull();
  });

  it("one word when it is paid", () => {
    expect(
      memberSubscriptionLine({ status: "ACTIVE", currentPeriodEnd: soon, cancelAt: null }),
    ).toBe("ACTIVE");
  });

  it("lapsed when the period has run out, whatever the rail last said", () => {
    expect(
      memberSubscriptionLine({ status: "ACTIVE", currentPeriodEnd: gone, cancelAt: null }),
    ).toBe("LAPSED");
  });

  it("cancelling until the date it actually ends", () => {
    expect(
      memberSubscriptionLine({ status: "ACTIVE", currentPeriodEnd: soon, cancelAt: soon }),
    ).toBe("CANCELLING");
  });
});

describe("applying what the rail said", () => {
  function fakeDb(existing: { id: string; provider: string } | null) {
    const writes: Record<string, unknown>[] = [];
    return {
      writes,
      db: {
        subscription: {
          findUnique: async () => existing,
          update: async ({ data }: { data: Record<string, unknown> }) => {
            writes.push({ op: "update", ...data });
            return {};
          },
          create: async ({ data }: { data: Record<string, unknown> }) => {
            writes.push({ op: "create", ...data });
            return {};
          },
        },
        memberProfile: {
          update: async () => {
            throw new Error("a payment must never write to her profile");
          },
        },
        roseCredential: {
          update: async () => {
            throw new Error("a payment must never touch her Rose");
          },
        },
      } as unknown as Db,
    };
  }

  it("marks a failed renewal LAPSED and touches nothing else", async () => {
    const { db, writes } = fakeDb({ id: "s1", provider: "STRIPE" });
    await applySubscriptionEvent(db, "m1", { ok: false });
    expect(writes).toEqual([{ op: "update", status: "LAPSED" }]);
  });

  it("marks a successful renewal ACTIVE and moves the period", async () => {
    const { db, writes } = fakeDb({ id: "s1", provider: "STRIPE" });
    await applySubscriptionEvent(db, "m1", { ok: true, periodEnd: soon, providerRef: "sub_1" });
    expect(writes[0]).toMatchObject({
      op: "update",
      status: "ACTIVE",
      currentPeriodEnd: soon,
      providerRef: "sub_1",
    });
  });

  it("creates one the first time", async () => {
    const { db, writes } = fakeDb(null);
    await applySubscriptionEvent(db, "m1", { ok: true, periodEnd: soon });
    expect(writes[0]).toMatchObject({ op: "create", memberId: "m1", status: "ACTIVE" });
  });

  it("never writes to her profile or her Rose — the fakes throw if it tries", async () => {
    const { db } = fakeDb({ id: "s1", provider: "STRIPE" });
    await expect(applySubscriptionEvent(db, "m1", { ok: false })).resolves.toBeUndefined();
  });
});
