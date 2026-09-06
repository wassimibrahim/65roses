// roseHealth — internal only. It decides whether she keeps receiving invitations.
// It is never serialized to a member-facing response and never shown as a number
// to anyone but staff. She sees one of three words, and that mapping happens in
// the DTO, not here.
//
// This function is pure. Recompute after every check-in and after every event
// closes — never on read, so a page load can never change her standing.
import type { AttendanceOutcome, MemberStatus, RsvpResponse } from "@prisma/client";
import {
  BASELINE,
  HISTORY_WINDOW,
  INVITABLE_STATUSES,
  MANUAL_STATUSES,
  RECENT_WINDOW,
  SCORE_MAX,
  SCORE_MIN,
  THRESHOLDS,
  WEIGHTS,
} from "./weights";

export interface RoseHealthOutcome {
  outcome: AttendanceOutcome;
  // when the night happened — used only to order the history
  at: Date;
}

export interface RoseHealthInput {
  // any order; the newest HISTORY_WINDOW resolved outcomes are the ones that count
  outcomes: RoseHealthOutcome[];
  // staff adjustments, positive or negative, applied after the weights
  adminAdjustment?: number;
  // a door flag or an incident — suspends the "she came recently" override
  flagged?: boolean;
  // an admin-set status is never computed away
  currentStatus?: MemberStatus;
}

export interface RoseHealthResult {
  score: number;
  status: MemberStatus;
}

function isManual(status: MemberStatus | undefined): boolean {
  return status !== undefined && (MANUAL_STATUSES as readonly string[]).includes(status);
}

function weightOf(outcome: AttendanceOutcome): number {
  switch (outcome) {
    case "ATTENDED":
      return WEIGHTS.ATTENDED;
    case "DECLINED_EARLY":
      return WEIGHTS.DECLINED_EARLY;
    case "DECLINED_LATE":
      return WEIGHTS.DECLINED_LATE;
    case "NO_SHOW":
      return WEIGHTS.NO_SHOW;
    case "EXCUSED":
      return WEIGHTS.EXCUSED;
    // PENDING — the night has not been settled yet. It costs nothing.
    default:
      return 0;
  }
}

export function computeRoseHealth(input: RoseHealthInput): RoseHealthResult {
  // PENDING nights are not history yet, and a stretch with no invitations
  // is not a fall from grace — only resolved outcomes move the number.
  const resolved = input.outcomes
    .filter((o) => o.outcome !== "PENDING")
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, HISTORY_WINDOW);

  const raw =
    BASELINE +
    resolved.reduce((sum, o) => sum + weightOf(o.outcome), 0) +
    (input.adminAdjustment ?? 0);
  const score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, raw));

  if (isManual(input.currentStatus)) {
    return { score, status: input.currentStatus as MemberStatus };
  }

  // she came recently and carries no flags — that outranks the arithmetic
  const cameRecently = resolved
    .slice(0, RECENT_WINDOW)
    .some((o) => o.outcome === "ATTENDED");
  if (cameRecently && !input.flagged) {
    return { score, status: "ACTIVE" };
  }

  if (score >= THRESHOLDS.ACTIVE) return { score, status: "ACTIVE" };
  if (score >= THRESHOLDS.QUIET) return { score, status: "QUIET" };
  // below QUIET she is AT_RISK — an operational label. There is no computed
  // status worse than this: nothing here ever bans a Rose.
  return { score, status: "AT_RISK" };
}

/**
 * Whether a Rose may be sent an invitation. This is the whole of "invitations
 * pause" — enforced in the send path, never left to whoever is picking names.
 * AT_RISK is where the third no-show puts her; she stays a Rose, she keeps her
 * number and her jewellery, and the nights go quiet until she wakes them.
 */
export function isInvitable(status: MemberStatus): boolean {
  return (INVITABLE_STATUSES as readonly string[]).includes(status);
}

// ── the persisted side ────────────────────────────────────────────────────

export interface RoseHealthDb {
  memberProfile: {
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
}

interface MemberRow {
  id: string;
  status: MemberStatus;
  rsvps: {
    outcome: AttendanceOutcome;
    response: RsvpResponse;
    event: { startsAt: Date };
  }[];
  _count: { invitations: number };
}

/**
 * Read her history, recompute, and write the result. Returns the new standing.
 * Call this after a check-in and after an event closes — never on a page read.
 */
export async function recomputeRoseHealth(
  db: RoseHealthDb,
  memberId: string,
  options: { flagged?: boolean; adminAdjustment?: number } = {},
): Promise<RoseHealthResult | null> {
  const member = (await db.memberProfile.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      status: true,
      rsvps: {
        orderBy: { event: { startsAt: "desc" } },
        take: HISTORY_WINDOW,
        select: { outcome: true, response: true, event: { select: { startsAt: true } } },
      },
      _count: { select: { invitations: true } },
    },
  })) as MemberRow | null;

  if (!member) return null;

  const result = computeRoseHealth({
    outcomes: member.rsvps.map((r) => ({ outcome: r.outcome, at: r.event.startsAt })),
    currentStatus: member.status,
    ...options,
  });

  // counters are derived, never incremented — they cannot drift out of true
  const counted = (outcome: AttendanceOutcome) =>
    member.rsvps.filter((r) => r.outcome === outcome).length;
  const attended = member.rsvps.filter((r) => r.outcome === "ATTENDED");

  await db.memberProfile.update({
    where: { id: memberId },
    data: {
      roseHealth: result.score,
      roseHealthAt: new Date(),
      status: result.status,
      ...(result.status === member.status ? {} : { statusChangedAt: new Date() }),
      eventsInvited: member._count.invitations,
      eventsConfirmed: member.rsvps.filter((r) => r.response === "CONFIRMED").length,
      eventsAttended: attended.length,
      eventsNoShow: counted("NO_SHOW"),
      eventsDeclined: counted("DECLINED_EARLY") + counted("DECLINED_LATE"),
      // only ever moved forward — a night older than the window must not erase it
      ...(attended[0] ? { lastAttendanceAt: attended[0].event.startsAt } : {}),
    },
  });

  return result;
}
