// everything /rose is allowed to know, in one query and one whitelisted shape.
// This is the only data path to her page; the test asserts nothing internal leaks.
import { toMemberDto, type MemberDto } from "./member";

export interface RoseHomeNight {
  index: string;
  name: string;
  slug: string;
  city: string;
  hours: "00—05";
  state: "OPEN" | "CONFIRMED" | "DECLINED";
  stemsAllowed: boolean;
  stemFirstName: string | null;
  eventId: string;
}

export interface RoseHomeDto {
  member: MemberDto;
  night: RoseHomeNight | null;
  // she has not told us where the Rose should find her yet
  needsAddress: boolean;
}

// the slice of prisma this needs — tests pass a fake
export interface RoseHomeDb {
  memberProfile: {
    findUnique(args: unknown): Promise<unknown>;
  };
}

export async function getRoseHomeData(
  db: RoseHomeDb,
  memberId: string,
  now: Date = new Date(),
): Promise<RoseHomeDto | null> {
  const member = (await db.memberProfile.findUnique({
    where: { id: memberId },
    include: {
      invitations: {
        where: {
          status: { in: ["SENT", "VIEWED", "RESPONDED"] },
          event: { endsAt: { gt: now }, status: { notIn: ["DRAFT", "CANCELLED"] } },
        },
        orderBy: { invitedAt: "desc" },
        take: 1,
        include: {
          event: true,
          rsvp: true,
        },
      },
      stemGuests: {
        where: { deletedAt: null, event: { endsAt: { gt: now } } },
        select: { firstName: true, eventId: true },
      },
      roseDeliveries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;

  if (!member || member.deletedAt) return null;

  const invitation = member.invitations[0];
  let night: RoseHomeNight | null = null;

  if (invitation) {
    const response = invitation.rsvp?.response;
    const stem = member.stemGuests.find(
      (s: { eventId: string }) => s.eventId === invitation.eventId,
    );
    night = {
      index: invitation.event.index,
      name: invitation.event.name,
      slug: invitation.event.slug,
      city: invitation.event.city,
      hours: "00—05",
      state: response === "CONFIRMED" ? "CONFIRMED" : response === "DECLINED" ? "DECLINED" : "OPEN",
      stemsAllowed: invitation.event.stemsAllowed,
      stemFirstName: stem?.firstName ?? null,
      eventId: invitation.eventId,
    };
  }

  return {
    member: toMemberDto(member),
    night,
    needsAddress: member.roseDeliveries?.[0]?.status === "PENDING_ADDRESS",
  };
}
