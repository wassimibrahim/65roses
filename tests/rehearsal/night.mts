// V3 — THE NIGHT REHEARSAL.
//
// One full night, seeded and walked at the data layer with every assertion the
// brief names, then measured. The interface has been walked separately, screen
// by screen, through every prompt; what has never been tested is the whole
// night at once — 40 applications in, 25 Roses out, and the arithmetic of how
// many messages a human receives for one night.
//
// The operations report at the end is the deliverable.
import assert from "node:assert/strict";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/crypto/hash";
import { opaqueToken } from "@/lib/crypto/token";
import { runHourly } from "@/lib/jobs";
import { closeAndFollowUp } from "@/lib/jobs/post-event";
import { admit } from "@/lib/door/entry";
import { generateDoorCode, hashDoorCode, roseCodeContext, stemCodeContext } from "@/lib/door/code";
import { ensureStemCredential } from "@/lib/stem-credential";
import { recomputeRoseHealth } from "@/lib/rose-health";
import { CITY_DEFAULTS } from "@/lib/cities";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const PREFIX = "rehearsal";

// the night is placed in the future and time is moved by passing `now` into the
// jobs, so nothing here depends on when the rehearsal is run
const EVENT_START = new Date(Date.now() + 10 * DAY);
const EVENT_END = new Date(EVENT_START.getTime() + 5 * HOUR);

const say = (s: string) => console.log(s);
const step = (s: string) => console.log(`\n── ${s}`);

interface Tally {
  doorTaps: number;
}
const tally: Tally = { doorTaps: 0 };

async function wipe() {
  const events = await prisma.event.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);
  const members = await prisma.memberProfile.findMany({
    where: { instagramHandle: { startsWith: PREFIX } },
    select: { id: true, userId: true },
  });
  const memberIds = members.map((m) => m.id);

  await prisma.checkIn.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.rsvp.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.stemCredential.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.payment.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.stemGuest.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.eventInvitation.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.messageLog.deleteMany({
    where: { OR: [{ eventId: { in: eventIds } }, { memberId: { in: memberIds } }] },
  });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  await prisma.roseCredential.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.roseDelivery.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.deliveryAddress.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.referral.deleteMany({ where: { authorMemberId: { in: memberIds } } });
  await prisma.memberProfile.deleteMany({ where: { id: { in: memberIds } } });
  await prisma.application.deleteMany({ where: { instagramHandle: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@rehearsal.invalid" } } });
}

const NAMES = [
  "Serena", "Talia", "Nour", "Maya", "Lea", "Yara", "Rana", "Zeina", "Dana", "Farah",
  "Layal", "Nadia", "Rima", "Sara", "Joelle", "Carla", "Mira", "Hala", "Lynn", "Aya",
  "Nay", "Perla", "Rita", "Sabine", "Tara", "Vera", "Wafa", "Yasmine", "Zahra", "Amal",
  "Bana", "Cyrine", "Dima", "Elsa", "Ghina", "Hiba", "Iman", "Jana", "Karma", "Lara",
];

async function main() {
  await wipe();

  // ── 40 applications ──
  step("40 applications");
  const applications = [];
  for (const [i, name] of NAMES.entries()) {
    applications.push(
      await prisma.application.create({
        data: {
          firstName: name,
          lastName: `Rehearsal${i}`,
          instagramHandle: `${PREFIX}${i}`,
          email: `${PREFIX}${i}@rehearsal.invalid`,
          phone: `+9617000${String(i).padStart(4, "0")}`,
          dateOfBirth: new Date("1996-01-01"),
          area: "Mar Mikhael",
          confirmedAdult: true,
          agreedHouseRules: true,
          consentMessaging: true,
          consentPrivacy: true,
          consentAt: new Date(),
          consentIp: "203.0.113.9",
        },
      }),
    );
  }
  assert.equal(applications.length, 40, "40 applications");
  say(`  ${applications.length} in`);

  // ── 25 approved, numbers allocated atomically ──
  step("25 approved — numbers 0065 upward, allocated one at a time");
  // this database may already hold Roses from other walks; a rehearsal begins
  // after the highest number in use, never on top of one
  const highest = await prisma.memberProfile.findFirst({
    orderBy: { memberNumber: "desc" },
    select: { memberNumber: true },
  });
  const sequenceBefore = await prisma.memberNumberSequence.findUnique({ where: { id: 1 } });
  const startAt = Math.max(sequenceBefore?.current ?? 64, Number(highest?.memberNumber ?? 64));
  await prisma.memberNumberSequence.upsert({
    where: { id: 1 },
    create: { id: 1, current: startAt },
    update: { current: startAt },
  });

  const members = [];
  const approveStart = Date.now();
  for (const application of applications.slice(0, 25)) {
    const member = await prisma.$transaction(async (tx) => {
      const seq = await tx.$queryRawUnsafe<{ current: number }[]>(
        'UPDATE "MemberNumberSequence" SET current = current + 1 WHERE id = 1 RETURNING current',
      );
      const number = String(seq[0]!.current).padStart(4, "0");
      const user = await tx.user.create({
        data: { email: application.email, role: "MEMBER" },
      });
      const profile = await tx.memberProfile.create({
        data: {
          userId: user.id,
          applicationId: application.id,
          memberNumber: number,
          firstName: application.firstName,
          lastName: application.lastName,
          instagramHandle: application.instagramHandle,
          phone: application.phone,
          dateOfBirth: application.dateOfBirth,
          area: application.area,
        },
      });
      await tx.application.update({
        where: { id: application.id },
        data: { status: "APPROVED", welcomeToken: opaqueToken(24), welcomeTokenExp: new Date(Date.now() + 7 * DAY) },
      });
      await tx.roseCredential.create({
        data: {
          memberId: profile.id,
          engravedNumber: number,
          serial: `S-${number}`,
          qrToken: opaqueToken(16),
        },
      });
      await tx.roseDelivery.create({ data: { memberId: profile.id, status: "PENDING_ADDRESS" } });
      return profile;
    });
    members.push(member);
  }
  const approveMs = Date.now() - approveStart;

  const numbers = members.map((m) => m.memberNumber);
  assert.equal(numbers.length, 25);
  assert.equal(new Set(numbers).size, 25, "no number issued twice");
  assert.equal(numbers[0], String(startAt + 1).padStart(4, "0"));
  say(`  ${numbers[0]} → ${numbers.at(-1)}, all distinct`);

  // ── accounts and phone verification ──
  step("25 create accounts and verify their phones");
  const hash = await hashPassword("a-real-password-2604");
  for (const member of members) {
    await prisma.user.update({ where: { id: member.userId }, data: { passwordHash: hash } });
    await prisma.memberProfile.update({
      where: { id: member.id },
      data: { phoneVerified: true, phoneVerifiedAt: new Date() },
    });
  }
  const verified = await prisma.memberProfile.count({
    where: { id: { in: members.map((m) => m.id) }, phoneVerified: true },
  });
  assert.equal(verified, 25, "all 25 verified");
  const rsvpReadyMs = Date.now() - approveStart;
  say(`  ${verified} verified`);

  // ── the night ──
  step("SERENA");
  // the index is the first free one, so a rehearsal never lands on a real night
  const taken = new Set(
    (await prisma.event.findMany({ select: { index: true } })).map((e) => e.index),
  );
  let index = "001";
  for (let i = 1; i < 1000; i++) {
    const candidate = String(i).padStart(3, "0");
    if (!taken.has(candidate)) {
      index = candidate;
      break;
    }
  }
  const event = await prisma.event.create({
    data: {
      name: "SERENA",
      index,
      slug: `${PREFIX}-serena`,
      city: "BEIRUT",
      timezone: CITY_DEFAULTS.BEIRUT.timezone,
      startsAt: EVENT_START,
      endsAt: EVENT_END,
      status: "ANNOUNCED",
      capacityTotal: 60,
      capacityRoses: 25,
      capacityStems: 20,
      stemsAllowed: true,
      stemPriceCents: CITY_DEFAULTS.BEIRUT.stemPriceCents,
      stemCurrency: CITY_DEFAULTS.BEIRUT.currency,
      editionMark: "leaf",
      venueName: "THE APARTMENT",
      venueAddress: "Rue Gouraud 12, Mar Mikhael",
      venueRevealAt: new Date(EVENT_START.getTime() - DAY),
      rsvpDeadline: new Date(EVENT_START.getTime() - 3 * DAY),
    },
  });
  say(`  ${event.index} ${event.name}, doors ${EVENT_START.toISOString()}`);

  // ── invitations ──
  step("25 invited");
  const invitations = [];
  for (const member of members) {
    invitations.push(
      await prisma.eventInvitation.create({
        data: { eventId: event.id, memberId: member.id, status: "SENT" },
      }),
    );
    await prisma.messageLog.create({
      data: {
        channel: "SMS",
        status: "SENT",
        templateKey: "invitation",
        toRedacted: `•••••${member.phone.slice(-3)}`,
        memberId: member.id,
        eventId: event.id,
        sentAt: new Date(),
      },
    });
  }
  await prisma.memberProfile.updateMany({
    where: { id: { in: members.map((m) => m.id) } },
    data: { eventsInvited: { increment: 1 }, lastInvitedAt: new Date() },
  });
  assert.equal(invitations.length, 25);
  say("  25 invitations, one message each");

  // ── 18 confirm, 4 decline early, 3 never respond ──
  step("18 confirm · 4 decline early · 3 say nothing");
  const confirmed: typeof members = [];
  const declined: typeof members = [];
  const silent: typeof members = [];

  for (const [i, member] of members.entries()) {
    const invitation = invitations[i]!;
    if (i < 18) {
      await prisma.rsvp.create({
        data: {
          eventId: event.id,
          memberId: member.id,
          invitationId: invitation.id,
          response: "CONFIRMED",
          confirmedAt: new Date(),
          outcome: "PENDING",
        },
      });
      confirmed.push(member);
    } else if (i < 22) {
      await prisma.rsvp.create({
        data: {
          eventId: event.id,
          memberId: member.id,
          invitationId: invitation.id,
          response: "DECLINED",
          declinedAt: new Date(),
          declinedEarly: true,
          outcome: "DECLINED_EARLY",
        },
      });
      declined.push(member);
    } else {
      silent.push(member);
    }
  }
  assert.equal(confirmed.length, 18);
  assert.equal(declined.length, 4);
  assert.equal(silent.length, 3);
  say("  18 · 4 · 3");

  // ── 14 register Stems, 12 pay ──
  step("14 Stems registered · 12 pay ahead · 1 pays cash at the door · 1 never pays");
  const stems = [];
  for (const [i, host] of confirmed.slice(0, 14).entries()) {
    const stem = await prisma.stemGuest.create({
      data: {
        eventId: event.id,
        hostMemberId: host.id,
        firstName: `Stem${i}`,
        lastName: `Guest${i}`,
        phone: `+9617100${String(i).padStart(4, "0")}`,
        dateOfBirth: new Date("1994-01-01"),
        token: opaqueToken(10),
        tokenExpiresAt: EVENT_END,
        paymentStatus: "NONE",
      },
    });
    stems.push(stem);

    if (i < 12) {
      await prisma.payment.create({
        data: {
          eventId: event.id,
          stemGuestId: stem.id,
          memberId: host.id,
          provider: "STRIPE",
          status: "PAID",
          amountCents: event.stemPriceCents,
          currency: event.stemCurrency,
          idempotencyKey: `rehearsal:${stem.id}`,
          paidAt: new Date(),
        },
      });
      await prisma.stemGuest.update({
        where: { id: stem.id },
        data: { paymentStatus: "PAID" },
      });
      await ensureStemCredential(prisma, stem.id, event.id);
      // she is told his first name and nothing else
      await prisma.messageLog.create({
        data: {
          channel: "SMS",
          status: "SENT",
          templateKey: "stem_paid",
          toRedacted: `•••••${host.phone.slice(-3)}`,
          memberId: host.id,
          eventId: event.id,
          sentAt: new Date(),
        },
      });
    }
  }
  assert.equal(stems.length, 14);
  assert.equal(
    await prisma.stemGuest.count({ where: { eventId: event.id, paymentStatus: "PAID" } }),
    12,
  );
  say("  14 registered, 12 paid");

  // ── T-36h: door codes ──
  step("T-36h — door codes issued");
  await prisma.event.update({ where: { id: event.id }, data: { status: "LOCKED" } });
  const atMinus36 = new Date(EVENT_START.getTime() - 36 * HOUR + 60_000);

  // codes are minted here so the rehearsal knows them; the hourly job is then
  // run to prove it does not mint a second set
  const roseCodes = new Map<string, string>();
  for (const member of confirmed) {
    const code = generateDoorCode();
    roseCodes.set(member.id, code);
    await prisma.rsvp.updateMany({
      where: { eventId: event.id, memberId: member.id },
      data: {
        doorCodeHash: hashDoorCode(code, roseCodeContext(event.id, member.id)),
        doorCodeIssuedAt: atMinus36,
      },
    });
    await prisma.messageLog.create({
      data: {
        channel: "SMS",
        status: "SENT",
        templateKey: "door_code",
        toRedacted: `•••••${member.phone.slice(-3)}`,
        memberId: member.id,
        eventId: event.id,
        sentAt: atMinus36,
      },
    });
  }
  const stemCodes = new Map<string, string>();
  for (const stem of stems.slice(0, 12)) {
    const code = generateDoorCode();
    stemCodes.set(stem.id, code);
    await prisma.stemGuest.update({
      where: { id: stem.id },
      data: {
        doorCodeHash: hashDoorCode(code, stemCodeContext(event.id, stem.id)),
        doorCodeIssuedAt: atMinus36,
      },
    });
  }

  const idempotent = await runHourly(prisma, atMinus36);
  assert.equal(idempotent.codes.roses, 0, "the job re-issues nothing");
  assert.equal(idempotent.codes.stems, 0, "the job re-issues nothing");
  say(`  18 Roses + 12 Stems hold a code; a second run issued ${idempotent.codes.roses}`);

  // ── T-24h: the venue ──
  step("T-24h — the venue, to confirmed Roses only");
  const atMinus24 = new Date(EVENT_START.getTime() - 24 * HOUR + 60_000);
  const venueRun = await runHourly(prisma, atMinus24);
  assert.equal(venueRun.venue, 18, "18 confirmed Roses told");

  const venueMessages = await prisma.messageLog.findMany({
    where: { eventId: event.id, templateKey: "venue" },
    select: { memberId: true, stemGuestId: true },
  });
  assert.equal(venueMessages.length, 18);
  assert.ok(
    venueMessages.every((m) => m.stemGuestId === null),
    "no Stem is ever told where the night is",
  );
  const declinedIds = new Set(declined.concat(silent).map((m) => m.id));
  assert.ok(
    venueMessages.every((m) => !declinedIds.has(m.memberId ?? "")),
    "nobody who declined or stayed silent is told",
  );

  const twice = await runHourly(prisma, new Date(atMinus24.getTime() + HOUR));
  assert.equal(twice.venue, 0, "the venue is not sent twice");
  say("  18 told · 0 Stems · 0 resends");

  // ── the door ──
  step("the door — 16 Roses and 11 Stems arrive");
  const duringNight = new Date(EVENT_START.getTime() + HOUR);
  const host = await prisma.user.findFirstOrThrow({ where: { role: "OWNER" } });

  const arrivingRoses = confirmed.slice(0, 16);
  for (const member of arrivingRoses) {
    const rsvp = await prisma.rsvp.findFirstOrThrow({
      where: { eventId: event.id, memberId: member.id },
      select: { id: true },
    });
    // a host taps: search, the row, four digits, done
    tally.doorTaps += 3 + 4;
    const result = await admit(
      prisma,
      event.id,
      host,
      { subject: "ROSE", id: rsvp.id, code: roseCodes.get(member.id)! },
      duringNight,
    );
    assert.equal(result.verdict, "IN", `${member.memberNumber} is in`);
  }

  const arrivingStems = stems.slice(0, 11);
  for (const stem of arrivingStems) {
    tally.doorTaps += 3 + 4;
    const result = await admit(
      prisma,
      event.id,
      host,
      { subject: "STEM", id: stem.id, code: stemCodes.get(stem.id)! },
      duringNight,
    );
    assert.equal(result.verdict, "IN", `${stem.firstName} is in`);
  }

  // the thirteenth Stem pays cash at the door
  const cashStem = stems[12]!;
  tally.doorTaps += 3 + 1 + 4;
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        eventId: event.id,
        stemGuestId: cashStem.id,
        provider: "CASH",
        status: "PAID",
        amountCents: event.stemPriceCents,
        currency: event.stemCurrency,
        idempotencyKey: `cash:${cashStem.id}`,
        paidAt: duringNight,
      },
    });
    await tx.stemGuest.update({
      where: { id: cashStem.id },
      data: { paymentStatus: "PAID" },
    });
  });
  await ensureStemCredential(prisma, cashStem.id, event.id);
  const cashResult = await admit(
    prisma,
    event.id,
    host,
    { subject: "STEM", id: cashStem.id, reason: "paid cash at the door" },
    duringNight,
  );
  assert.equal(cashResult.verdict, "IN");

  // the fourteenth never paid and is refused
  const unpaid = stems[13]!;
  tally.doorTaps += 3 + 4;
  const refused = await admit(
    prisma,
    event.id,
    host,
    { subject: "STEM", id: unpaid.id, code: "0000" },
    duringNight,
  );
  assert.equal(refused.verdict, "NOT_PAID", "the unpaid Stem is refused");

  // a code cannot be used twice
  const firstRose = await prisma.rsvp.findFirstOrThrow({
    where: { eventId: event.id, memberId: arrivingRoses[0]!.id },
    select: { id: true },
  });
  const replay = await admit(
    prisma,
    event.id,
    host,
    { subject: "ROSE", id: firstRose.id, code: roseCodes.get(arrivingRoses[0]!.id)! },
    duringNight,
  );
  assert.equal(replay.verdict, "ALREADY_IN", "a code opens the door once");

  const inside = await prisma.checkIn.count({ where: { eventId: event.id } });
  assert.equal(inside, 16 + 12, "16 Roses and 12 Stems inside");
  say(`  ${inside} inside — 16 Roses, 12 Stems (11 prepaid, 1 cash)`);

  // ── the night closes ──
  step("the doors close");
  const morning = new Date(EVENT_END.getTime() + HOUR);
  const closed = await closeAndFollowUp(prisma, morning);
  assert.equal(closed.settled, 1, "one event settled");

  const settled = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    select: { status: true },
  });
  assert.equal(settled.status, "CLOSED");

  const attended = await prisma.rsvp.count({ where: { eventId: event.id, outcome: "ATTENDED" } });
  const noShows = await prisma.rsvp.count({ where: { eventId: event.id, outcome: "NO_SHOW" } });
  assert.equal(attended, 16, "16 attended");
  assert.equal(noShows, 2, "2 confirmed and did not come");
  say(`  ${attended} attended · ${noShows} no-shows · bracelets expired`);

  const bracelets = await prisma.stemCredential.count({
    where: { eventId: event.id, status: "EXPIRED" },
  });
  assert.ok(bracelets > 0, "old bracelets die with the night");

  // ── standing ──
  step("standing recomputed");
  for (const member of members) await recomputeRoseHealth(prisma, member.id);

  const came = await prisma.memberProfile.findFirstOrThrow({
    where: { id: arrivingRoses[0]!.id },
    select: { roseHealth: true, status: true, eventsAttended: true },
  });
  assert.equal(came.status, "ACTIVE");
  assert.equal(came.eventsAttended, 1);

  const missed = await prisma.memberProfile.findFirstOrThrow({
    where: { id: confirmed[16]!.id },
    select: { roseHealth: true, status: true, eventsNoShow: true },
  });
  assert.equal(missed.eventsNoShow, 1);
  assert.equal(missed.roseHealth, 75);
  assert.equal(missed.status, "ACTIVE", "one no-show does not move her out of ACTIVE");

  const declinedEarly = await prisma.memberProfile.findFirstOrThrow({
    where: { id: declined[0]!.id },
    select: { roseHealth: true, status: true },
  });
  assert.equal(declinedEarly.roseHealth, 99, "declining in time costs one point");
  assert.equal(declinedEarly.status, "ACTIVE");

  const neverAnswered = await prisma.memberProfile.findFirstOrThrow({
    where: { id: silent[0]!.id },
    select: { roseHealth: true, status: true },
  });
  assert.equal(neverAnswered.roseHealth, 100, "silence costs nothing");
  say(
    `  came ${came.roseHealth} · missed ${missed.roseHealth} · declined early ${declinedEarly.roseHealth} · silent ${neverAnswered.roseHealth}`,
  );

  // ── the morning after ──
  step("the day after — one line to whoever did not come");
  const dayAfter = new Date(EVENT_END.getTime() + 20 * HOUR);
  const followUp = await closeAndFollowUp(prisma, dayAfter);
  assert.equal(followUp.messaged, 2, "the two no-shows, and nobody else");

  const missedYou = await prisma.messageLog.count({
    where: { eventId: event.id, templateKey: "missed_you" },
  });
  assert.equal(missedYou, 2);

  const again = await closeAndFollowUp(prisma, new Date(dayAfter.getTime() + HOUR));
  assert.equal(again.messaged, 0, "never twice for the same night");
  say("  2 messages · WE MISSED YOU. · not repeated");

  // ── the report ──
  const perPerson = await prisma.messageLog.groupBy({
    by: ["memberId"],
    where: { eventId: event.id, memberId: { not: null } },
    _count: { _all: true },
  });
  const counts = perPerson.map((p) => p._count._all);
  const loudest = Math.max(...counts);
  const guests = 16 + 12;

  console.log(`
════════════════════════════════════════
OPERATIONS REPORT — ${event.index} ${event.name}
════════════════════════════════════════

THE DOOR
  guests admitted            ${guests}
  taps by staff              ${tally.doorTaps}
  taps per guest             ${(tally.doorTaps / guests).toFixed(1)}
  (search 3 · the row 1 · four digits 4, minus the row for a cash payment)

MESSAGES PER PERSON, THIS NIGHT
  Roses receiving any        ${perPerson.length}
  most received by one       ${loudest}
  average                    ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}
  over four for one night    ${counts.filter((c) => c > 4).length}
  ${loudest > 4 ? "!! WE ARE BEING NOISY" : "within four — quiet enough"}

  a Rose who came:           invitation · door code · venue        = 3
  a Rose who did not:        invitation · door code · venue · WE MISSED YOU. = 4
  a Rose who declined early: invitation                            = 1
  a Rose who said nothing:   invitation                            = 1
  a Stem:                    his link · his code                   = 2

TIME
  APPROVE → number allocated    ${(approveMs / 25).toFixed(0)}ms per Rose
  APPROVE → able to RSVP        ${(rsvpReadyMs / 1000).toFixed(1)}s for all 25
  (the wait is hers: she opens the link, makes a password, answers her phone)

MONEY
  Stems paid ahead              12 × ${event.stemPriceCents / 100} ${event.stemCurrency}
  cash at the door              1
  never paid, refused           1
════════════════════════════════════════`);

  return { loudest, counts };
}

const result = await main();
await prisma.$disconnect();
if (result.loudest > 4) process.exitCode = 1;
