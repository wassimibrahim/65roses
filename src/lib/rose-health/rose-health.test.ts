// The constitution's section 9, made executable. If these ever fail, the
// weighting principle has drifted and someone should be woken up.
import { describe, expect, it } from "vitest";
import type { AttendanceOutcome } from "@prisma/client";
import { computeRoseHealth, recomputeRoseHealth, type RoseHealthOutcome } from "./index";
import { BASELINE, HISTORY_WINDOW, THRESHOLDS, WEIGHTS } from "./weights";

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-01-01T00:00:00Z").getTime();

// nights, newest last — index 0 is the oldest
function history(...outcomes: AttendanceOutcome[]): RoseHealthOutcome[] {
  return outcomes.map((outcome, i) => ({ outcome, at: new Date(T0 + i * 30 * DAY) }));
}

describe("computeRoseHealth", () => {
  it("a Rose with no history is ACTIVE at the baseline", () => {
    expect(computeRoseHealth({ outcomes: [] })).toEqual({ score: BASELINE, status: "ACTIVE" });
  });

  it("declining ahead of the deadline costs almost nothing", () => {
    const many = history(...Array<AttendanceOutcome>(6).fill("DECLINED_EARLY"));
    const result = computeRoseHealth({ outcomes: many });
    expect(result.score).toBe(BASELINE + 6 * WEIGHTS.DECLINED_EARLY);
    expect(result.score).toBeGreaterThanOrEqual(THRESHOLDS.ACTIVE);
    expect(result.status).toBe("ACTIVE");
  });

  it("declining late costs more than declining early, and much less than vanishing", () => {
    expect(Math.abs(WEIGHTS.DECLINED_LATE)).toBeGreaterThan(Math.abs(WEIGHTS.DECLINED_EARLY));
    expect(Math.abs(WEIGHTS.NO_SHOW)).toBeGreaterThan(Math.abs(WEIGHTS.DECLINED_LATE));
  });

  it("time alone never decays a Rose — a night three years back weighs the same", () => {
    const ancient = [{ outcome: "ATTENDED" as AttendanceOutcome, at: new Date(T0 - 1100 * DAY) }];
    const recent = [{ outcome: "ATTENDED" as AttendanceOutcome, at: new Date(T0) }];
    const adminAdjustment = -50; // clear of the ceiling, so the weight is visible
    expect(computeRoseHealth({ outcomes: ancient, adminAdjustment }).score).toBe(
      BASELINE - 50 + WEIGHTS.ATTENDED,
    );
    expect(computeRoseHealth({ outcomes: ancient, adminAdjustment }).score).toBe(
      computeRoseHealth({ outcomes: recent, adminAdjustment }).score,
    );
  });

  it("a night that has not been settled yet costs nothing", () => {
    expect(computeRoseHealth({ outcomes: history("PENDING", "PENDING") }).score).toBe(BASELINE);
  });

  it("an excused absence is free", () => {
    expect(computeRoseHealth({ outcomes: history("EXCUSED", "EXCUSED") }).score).toBe(BASELINE);
  });

  // the simulation named in the build brief
  it("confirm and not arrive, three times, goes QUIET — never banned", () => {
    const result = computeRoseHealth({ outcomes: history("NO_SHOW", "NO_SHOW", "NO_SHOW") });
    expect(result.score).toBe(BASELINE + 3 * WEIGHTS.NO_SHOW);
    expect(result.status).toBe("AT_RISK");
    // AT_RISK is operational; what she is shown is QUIET, and she keeps her Rose
    expect(["PAUSED", "SUSPENDED", "DECLINED", "INACTIVE"]).not.toContain(result.status);
  });

  it("never falls below zero, however bad the history", () => {
    const result = computeRoseHealth({
      outcomes: history(...Array<AttendanceOutcome>(10).fill("NO_SHOW")),
    });
    expect(result.score).toBe(0);
    expect(result.status).toBe("AT_RISK");
  });

  it("never rises above one hundred, however good", () => {
    const result = computeRoseHealth({
      outcomes: history(...Array<AttendanceOutcome>(8).fill("ATTENDED")),
    });
    expect(result.score).toBe(100);
    expect(result.status).toBe("ACTIVE");
  });

  it("attending one of the last three outranks the arithmetic", () => {
    // two no-shows would put her at 50 — but she came to the most recent night
    const result = computeRoseHealth({ outcomes: history("NO_SHOW", "NO_SHOW", "ATTENDED") });
    expect(result.score).toBeLessThan(THRESHOLDS.ACTIVE);
    expect(result.status).toBe("ACTIVE");
  });

  it("the override does not apply when she carries a flag", () => {
    const outcomes = history("NO_SHOW", "NO_SHOW", "ATTENDED");
    expect(computeRoseHealth({ outcomes, flagged: true }).status).not.toBe("ACTIVE");
  });

  it("an attendance older than the last three does not trigger the override", () => {
    const result = computeRoseHealth({
      outcomes: history("ATTENDED", "NO_SHOW", "NO_SHOW", "NO_SHOW"),
    });
    expect(result.status).toBe("AT_RISK");
  });

  it("only the newest window of outcomes counts", () => {
    const long = history(...Array<AttendanceOutcome>(HISTORY_WINDOW + 5).fill("DECLINED_LATE"));
    const result = computeRoseHealth({ outcomes: long });
    expect(result.score).toBe(
      Math.max(0, BASELINE + HISTORY_WINDOW * WEIGHTS.DECLINED_LATE),
    );
  });

  it("orders history by date, not by array position", () => {
    const scrambled: RoseHealthOutcome[] = [
      { outcome: "NO_SHOW", at: new Date(T0) },
      { outcome: "ATTENDED", at: new Date(T0 + 60 * DAY) },
      { outcome: "NO_SHOW", at: new Date(T0 + 30 * DAY) },
    ];
    // the newest is ATTENDED → the override applies
    expect(computeRoseHealth({ outcomes: scrambled }).status).toBe("ACTIVE");
  });

  it("an admin adjustment moves the score", () => {
    expect(computeRoseHealth({ outcomes: [], adminAdjustment: -40 })).toEqual({
      score: 60,
      status: "QUIET",
    });
  });

  it.each(["PAUSED", "SUSPENDED", "DECLINED", "INACTIVE"] as const)(
    "never computes %s away — an admin put it there",
    (status) => {
      const result = computeRoseHealth({
        outcomes: history("ATTENDED", "ATTENDED"),
        currentStatus: status,
      });
      expect(result.status).toBe(status);
      expect(result.score).toBeGreaterThan(THRESHOLDS.ACTIVE);
    },
  );

  it("thresholds sit where the constitution says", () => {
    const at = (score: number) =>
      computeRoseHealth({ outcomes: [], adminAdjustment: score - BASELINE }).status;
    expect(at(70)).toBe("ACTIVE");
    expect(at(69)).toBe("QUIET");
    expect(at(45)).toBe("QUIET");
    expect(at(44)).toBe("AT_RISK");
    expect(at(0)).toBe("AT_RISK");
  });
});

describe("recomputeRoseHealth", () => {
  function fakeDb(rsvps: { outcome: AttendanceOutcome; response: string; at: Date }[]) {
    const writes: Record<string, unknown>[] = [];
    return {
      writes,
      db: {
        memberProfile: {
          findUnique: async () => ({
            id: "m1",
            status: "ACTIVE",
            rsvps: rsvps.map((r) => ({
              outcome: r.outcome,
              response: r.response,
              event: { startsAt: r.at },
            })),
            _count: { invitations: rsvps.length },
          }),
          update: async (args: { data: Record<string, unknown> }) => {
            writes.push(args.data);
            return {};
          },
        },
      },
    };
  }

  it("writes the score, the status and derived counters", async () => {
    const { db, writes } = fakeDb([
      { outcome: "ATTENDED", response: "CONFIRMED", at: new Date(T0 + 60 * DAY) },
      { outcome: "NO_SHOW", response: "CONFIRMED", at: new Date(T0 + 30 * DAY) },
      { outcome: "DECLINED_EARLY", response: "DECLINED", at: new Date(T0) },
    ]);
    const result = await recomputeRoseHealth(db, "m1");

    expect(result).toEqual({ score: BASELINE + 12 - 25 - 1, status: "ACTIVE" });
    expect(writes[0]).toMatchObject({
      roseHealth: 86,
      status: "ACTIVE",
      eventsInvited: 3,
      eventsConfirmed: 2,
      eventsAttended: 1,
      eventsNoShow: 1,
      eventsDeclined: 1,
      lastAttendanceAt: new Date(T0 + 60 * DAY),
    });
  });

  it("leaves lastAttendanceAt alone when the window holds no attendance", async () => {
    const { db, writes } = fakeDb([
      { outcome: "NO_SHOW", response: "CONFIRMED", at: new Date(T0) },
    ]);
    await recomputeRoseHealth(db, "m1");
    expect(writes[0]).not.toHaveProperty("lastAttendanceAt");
  });

  it("returns null for a member who is not there", async () => {
    const db = {
      memberProfile: { findUnique: async () => null, update: async () => ({}) },
    };
    expect(await recomputeRoseHealth(db, "gone")).toBeNull();
  });
});
