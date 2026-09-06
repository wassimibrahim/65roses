// Tonight's list, and the exact shape of it that reaches a phone at the door.
//
// This is a whitelist. The door needs to find a person and confirm she is
// expected — nothing more. Her email, her address, her instagram, her standing
// and every other guest's details stay on the server. The last four digits of a
// phone are here because a host will be handed a number, never the whole one.
import type { Db } from "@/lib/db/client";

export interface DoorEntry {
  id: string; // rsvp id or stem guest id — never a member id
  subject: "ROSE" | "STEM";
  firstName: string;
  lastName: string;
  // hers, or the number of the Rose he is with
  memberNumber: string;
  last4: string;
  confirmed: boolean;
  paid: boolean;
  bracelet: string | null;
  inside: boolean;
  enteredAt: string | null;
  // she is not on the list tonight, or she is paused — the door is told to
  // fetch a host, and never told why
  askAHost: boolean;
}

export interface DoorState {
  event: { id: string; name: string; index: string };
  counts: { roses: number; stems: number; total: number };
  roster: DoorEntry[];
  at: string;
}

const last4 = (phone: string) => phone.replace(/\D/g, "").slice(-4);

export async function doorState(db: Db, eventId: string): Promise<DoorState> {
  const event = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { id: true, name: true, index: true },
  });

  const rsvps = await db.rsvp.findMany({
    where: { eventId },
    select: {
      id: true,
      response: true,
      checkInId: true,
      checkIn: { select: { enteredAt: true } },
      member: {
        select: {
          firstName: true,
          lastName: true,
          memberNumber: true,
          phone: true,
          status: true,
        },
      },
    },
  });

  const stems = await db.stemGuest.findMany({
    where: { eventId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      paymentStatus: true,
      checkIn: { select: { enteredAt: true } },
      credential: { select: { braceletSerial: true, editionMark: true } },
      hostMember: { select: { memberNumber: true } },
    },
  });

  const roster: DoorEntry[] = [
    ...rsvps.map((r) => ({
      id: r.id,
      subject: "ROSE" as const,
      firstName: r.member.firstName,
      lastName: r.member.lastName,
      memberNumber: r.member.memberNumber,
      last4: last4(r.member.phone),
      confirmed: r.response === "CONFIRMED",
      paid: true,
      bracelet: null,
      inside: r.checkInId !== null,
      enteredAt: r.checkIn?.enteredAt.toISOString() ?? null,
      // PAUSED and the rest never explain themselves at the door
      askAHost: r.member.status !== "ACTIVE" && r.member.status !== "QUIET",
    })),
    ...stems.map((s) => ({
      id: s.id,
      subject: "STEM" as const,
      firstName: s.firstName,
      lastName: s.lastName,
      memberNumber: s.hostMember.memberNumber,
      last4: last4(s.phone),
      confirmed: s.paymentStatus === "PAID",
      paid: s.paymentStatus === "PAID",
      bracelet: s.credential?.braceletSerial ?? s.credential?.editionMark ?? null,
      inside: s.checkIn !== null,
      enteredAt: s.checkIn?.enteredAt.toISOString() ?? null,
      askAHost: false,
    })),
  ];

  // the count is how many people are in the room, so it is taken from the
  // check-ins themselves — a walk-in has no roster row and still stands inside
  const inside = await db.checkIn.groupBy({
    by: ["subject"],
    where: { eventId, exitedAt: null },
    _count: { _all: true },
  });
  const countOf = (subject: "ROSE" | "STEM") =>
    inside.find((row) => row.subject === subject)?._count._all ?? 0;

  return {
    event,
    counts: {
      roses: countOf("ROSE"),
      stems: countOf("STEM"),
      total: countOf("ROSE") + countOf("STEM"),
    },
    roster,
    at: new Date().toISOString(),
  };
}
