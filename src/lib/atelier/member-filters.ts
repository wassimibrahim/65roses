// Turning a query string into a Prisma where clause, in one tested place.
// The atelier's filters are the most-used surface in the building; a wrong
// clause here quietly hides a Rose from the people deciding who to invite.
import type { Prisma } from "@prisma/client";

export interface MemberFilters {
  status?: string;
  city?: string;
  founding?: string;
  delivered?: string;
  community?: string;
  noShows?: string;
  lastFrom?: string;
  lastTo?: string;
  q?: string;
}

const STATUSES = [
  "ACTIVE",
  "QUIET",
  "AT_RISK",
  "PAUSED",
  "DECLINED",
  "SUSPENDED",
  "INACTIVE",
] as const;

const COMMUNITY = ["NOT_INVITED", "INVITED", "JOINED", "LEFT", "REMOVED"] as const;

export const MEMBER_STATUSES = STATUSES;
export const COMMUNITY_STATUSES = COMMUNITY;

const oneOf = <T extends readonly string[]>(list: T, value: string | undefined) =>
  value && (list as readonly string[]).includes(value) ? (value as T[number]) : undefined;

function date(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function memberWhere(filters: MemberFilters): Prisma.MemberProfileWhereInput {
  const where: Prisma.MemberProfileWhereInput = { deletedAt: null };

  const status = oneOf(STATUSES, filters.status);
  if (status) where.status = status;

  const city = oneOf(["BEIRUT", "MADRID"] as const, filters.city);
  if (city) where.city = city;

  if (filters.founding === "1") where.foundingRose = true;

  const community = oneOf(COMMUNITY, filters.community);
  if (community) where.communityStatus = community;

  // "has her Rose arrived" is a question about deliveries, not about her
  if (filters.delivered === "1") {
    where.roseDeliveries = { some: { status: "DELIVERED" } };
  } else if (filters.delivered === "0") {
    where.roseDeliveries = { none: { status: "DELIVERED" } };
  }

  const minNoShows = Number(filters.noShows);
  if (Number.isFinite(minNoShows) && minNoShows > 0) {
    where.eventsNoShow = { gte: minNoShows };
  }

  const from = date(filters.lastFrom);
  const to = date(filters.lastTo);
  if (from || to) {
    where.lastAttendanceAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { instagramHandle: { contains: q, mode: "insensitive" } },
      { memberNumber: { contains: q } },
    ];
  }

  return where;
}
