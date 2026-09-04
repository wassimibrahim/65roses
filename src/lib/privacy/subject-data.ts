// Everything we hold about one Rose, and the erasure of it.
//
// Section 11 requires both from the start. They live here together on purpose:
// the export is the list of what exists, so the erasure has no excuse to miss
// a table the export knows about.
import type { Db } from "@/lib/db/client";

export interface SubjectData {
  exportedAt: string;
  member: Record<string, unknown>;
  application: Record<string, unknown> | null;
  address: Record<string, unknown> | null;
  rose: Record<string, unknown> | null;
  nights: Record<string, unknown>[];
  stems: Record<string, unknown>[];
  arrivals: Record<string, unknown>[];
  deliveries: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  referralsMade: Record<string, unknown>[];
}

/**
 * Her copy of her own data. Decrypted on the way out — it is hers, and this is
 * the one response allowed to carry her address and her phone in full.
 *
 * roseHealth and the counters behind it are internal operational judgements
 * rather than her personal data, and are not part of this file; if she asks for
 * them, a person answers, which is also how the constitution wants that
 * conversation to go.
 */
export async function exportSubjectData(db: Db, memberId: string): Promise<SubjectData | null> {
  const member = await db.memberProfile.findUnique({
    where: { id: memberId },
    select: {
      memberNumber: true,
      firstName: true,
      lastName: true,
      instagramHandle: true,
      phone: true,
      phoneVerified: true,
      dateOfBirth: true,
      city: true,
      area: true,
      status: true,
      foundingRose: true,
      communityStatus: true,
      createdAt: true,
      user: { select: { email: true, createdAt: true, lastLoginAt: true } },
      application: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          instagramHandle: true,
          dateOfBirth: true,
          city: true,
          area: true,
          howFound: true,
          referralCode: true,
          status: true,
          confirmedAdult: true,
          agreedHouseRules: true,
          consentMessaging: true,
          consentPrivacy: true,
          consentAt: true,
          consentIp: true,
          createdAt: true,
        },
      },
      deliveryAddress: {
        select: {
          recipientName: true,
          phone: true,
          city: true,
          area: true,
          addressLine: true,
          notes: true,
          updatedAt: true,
        },
      },
      roseCredential: {
        select: { engravedNumber: true, serial: true, status: true, issuedAt: true },
      },
      invitations: {
        select: {
          status: true,
          invitedAt: true,
          respondedAt: true,
          event: { select: { index: true, name: true, city: true, startsAt: true } },
          rsvp: { select: { response: true, outcome: true, confirmedAt: true, declinedAt: true } },
        },
      },
      stemGuests: {
        select: {
          firstName: true,
          lastName: true,
          relationshipNote: true,
          paymentStatus: true,
          outcome: true,
          createdAt: true,
          event: { select: { index: true, name: true } },
        },
      },
      checkIns: {
        select: {
          enteredAt: true,
          verifyMethod: true,
          event: { select: { index: true, name: true } },
        },
      },
      roseDeliveries: {
        select: { status: true, deliveredAt: true, courier: true, createdAt: true },
      },
      messages: {
        select: { channel: true, templateKey: true, status: true, toRedacted: true, createdAt: true },
      },
      referralsMade: {
        select: { instagramHandle: true, note: true, status: true, createdAt: true },
      },
    },
  });

  if (!member) return null;

  const payments = await db.payment.findMany({
    where: { memberId },
    select: { provider: true, status: true, amountCents: true, currency: true, paidAt: true },
  });

  const {
    application,
    deliveryAddress,
    roseCredential,
    invitations,
    stemGuests,
    checkIns,
    roseDeliveries,
    messages,
    referralsMade,
    ...profile
  } = member;

  return {
    exportedAt: new Date().toISOString(),
    member: profile,
    application: application ?? null,
    address: deliveryAddress ?? null,
    rose: roseCredential ?? null,
    nights: invitations,
    stems: stemGuests,
    arrivals: checkIns,
    deliveries: roseDeliveries,
    messages,
    payments,
    referralsMade,
  };
}

export interface ErasureResult {
  memberNumber: string;
  erasedAt: string;
}

/**
 * Erasure. What goes, what stays, and why:
 *
 * GOES — her name, her phone, her email, her instagram, her date of birth, her
 * address, the note she wrote about her Stem, the handles she referred. Every
 * field that is about a person rather than about a night.
 *
 * STAYS — the audit trail, because a log an operator can erase is not a log,
 * and it holds no name; the payment rows, which are financial records; and the
 * member number itself, retired rather than reused. Her number was never going
 * to be given to someone else, and that does not change because she left.
 *
 * The rows that remain are unlinked from her identity, not kept beside it.
 */
export async function eraseSubject(db: Db, memberId: string): Promise<ErasureResult | null> {
  const member = await db.memberProfile.findUnique({
    where: { id: memberId },
    select: { id: true, memberNumber: true, userId: true, applicationId: true },
  });
  if (!member) return null;

  const now = new Date();
  const stamp = now.getTime().toString(36);

  await db.$transaction(async (tx) => {
    await tx.deliveryAddress.deleteMany({ where: { memberId } });
    await tx.referral.updateMany({
      where: { authorMemberId: memberId },
      data: { note: null, status: "DECLINED" },
    });
    await tx.stemGuest.updateMany({
      where: { hostMemberId: memberId },
      data: { relationshipNote: null },
    });

    await tx.memberProfile.update({
      where: { id: memberId },
      data: {
        firstName: "—",
        lastName: "—",
        // unique columns need a value that cannot collide with a real one
        instagramHandle: `erased-${stamp}`,
        phone: `erased-${stamp}`,
        phoneVerified: false,
        area: null,
        status: "INACTIVE",
        deletedAt: now,
      },
    });

    if (member.applicationId) {
      await tx.application.update({
        where: { id: member.applicationId },
        data: {
          firstName: "—",
          lastName: "—",
          email: `erased-${stamp}@erased.invalid`,
          phone: `erased-${stamp}`,
          instagramHandle: `erased-${stamp}`,
          howFound: null,
          referralCode: null,
          welcomeToken: null,
          consentIp: null,
          deletedAt: now,
        },
      });
    }

    await tx.session.updateMany({ where: { userId: member.userId }, data: { revokedAt: now } });
    await tx.user.update({
      where: { id: member.userId },
      data: {
        email: `erased-${stamp}@erased.invalid`,
        passwordHash: null,
        deletedAt: now,
      },
    });
  });

  return { memberNumber: member.memberNumber, erasedAt: now.toISOString() };
}
