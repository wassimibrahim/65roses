// Every number that decides whether a Rose stays ACTIVE lives here, alone,
// so tuning the world is one file and one review — never a hunt through logic.
//
// The principle, from the constitution: declining ahead of the deadline is
// respectful behaviour and costs almost nothing. Confirming and then not
// arriving is the only real offense. Silence costs nothing at all.

export const BASELINE = 100;

export const WEIGHTS = {
  ATTENDED: 12,
  DECLINED_EARLY: -1, // she told us in time — near zero, on purpose
  DECLINED_LATE: -6,
  NO_SHOW: -25, // confirmed, then absent
  EXCUSED: 0,
} as const;

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

// ACTIVE >= 70 · QUIET 45–69 · AT_RISK below 45. PAUSED is never computed.
export const THRESHOLDS = {
  ACTIVE: 70,
  QUIET: 45,
} as const;

// how many resolved outcomes count toward the score
export const HISTORY_WINDOW = 12;

// attended at least one of the last this-many invited events → ACTIVE regardless
export const RECENT_WINDOW = 3;

// statuses a computation may never overwrite — an admin put them there
export const MANUAL_STATUSES = ["PAUSED", "SUSPENDED", "DECLINED", "INACTIVE"] as const;

// the only statuses that receive invitations — everything else is a quiet season
export const INVITABLE_STATUSES = ["ACTIVE", "QUIET"] as const;
