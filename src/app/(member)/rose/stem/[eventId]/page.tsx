// /rose/stem/[eventId] — guarded: hers only, confirmed only, stems allowed, until the deadline
import { redirect } from "next/navigation";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { Serial } from "@/components/world/Serial";
import { StemFlow } from "./StemFlow";

export default async function StemRegisterPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  let memberId: string | undefined;
  try {
    const user = await requireVerifiedPhone();
    memberId = user.memberId;
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }

  const { eventId } = await params;
  const rsvp = memberId
    ? await prisma.rsvp.findUnique({
        where: { eventId_memberId: { eventId, memberId } },
        include: {
          event: {
            select: { id: true, name: true, stemsAllowed: true, endsAt: true, rsvpDeadline: true },
          },
        },
      })
    : null;

  if (
    !rsvp ||
    rsvp.response !== "CONFIRMED" ||
    !rsvp.event.stemsAllowed ||
    rsvp.event.endsAt.getTime() < Date.now()
  ) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <ChalkText size="line">{copy.errors.notFound}</ChalkText>
      </main>
    );
  }

  const existing = await prisma.stemGuest.findUnique({
    where: { eventId_hostMemberId: { eventId, hostMemberId: memberId! } },
    select: { firstName: true, token: true, deletedAt: true },
  });

  const canReplace = !rsvp.event.rsvpDeadline || Date.now() < rsvp.event.rsvpDeadline.getTime();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-8 py-24">
      <StemFlow
        eventId={eventId}
        eventName={rsvp.event.name}
        canReplace={canReplace}
        existing={
          existing && !existing.deletedAt
            ? { firstName: existing.firstName, token: existing.token }
            : null
        }
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
      />
      <Serial />
    </main>
  );
}
