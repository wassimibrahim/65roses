// StemCredential creation — event-scoped, edition-marked, dies at event end (+1h grace).
// Idempotent: an existing credential for the guest is left untouched.
import { opaqueToken } from "@/lib/crypto/token";

interface CredentialDb {
  stemCredential: {
    findUnique(args: {
      where: { stemGuestId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  event: {
    findUniqueOrThrow(args: {
      where: { id: string };
      select: { editionMark: true; startsAt: true; endsAt: true };
    }): Promise<{ editionMark: string; startsAt: Date; endsAt: Date }>;
  };
}

export async function ensureStemCredential(
  db: CredentialDb,
  stemGuestId: string,
  eventId: string,
): Promise<void> {
  const existing = await db.stemCredential.findUnique({
    where: { stemGuestId },
    select: { id: true },
  });
  if (existing) return;

  const event = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { editionMark: true, startsAt: true, endsAt: true },
  });

  await db.stemCredential.create({
    data: {
      stemGuestId,
      eventId,
      qrToken: opaqueToken(16),
      editionMark: event.editionMark,
      status: "ASSIGNED",
      validFrom: new Date(event.startsAt.getTime() - 2 * 60 * 60 * 1000),
      validTo: new Date(event.endsAt.getTime() + 60 * 60 * 1000),
    },
  });
}
