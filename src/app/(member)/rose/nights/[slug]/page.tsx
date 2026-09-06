// /rose/nights/[slug] — one night, one decision. No invitation, no page.
import { redirect } from "next/navigation";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Serial } from "@/components/world/Serial";
import { Reveal } from "@/components/ui/Reveal";
import { RsvpChoice } from "./RsvpChoice";

export default async function NightPage({ params }: { params: Promise<{ slug: string }> }) {
  let memberId: string | undefined;
  try {
    const user = await requireVerifiedPhone();
    memberId = user.memberId;
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }

  const { slug } = await params;
  const invitation = memberId
    ? await prisma.eventInvitation.findFirst({
        where: {
          memberId,
          status: { not: "REVOKED" },
          event: { slug, deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED"] } },
        },
        include: {
          event: {
            select: {
              id: true,
              index: true,
              name: true,
              city: true,
              rsvpDeadline: true,
              endsAt: true,
              stemsAllowed: true,
            },
          },
          rsvp: { select: { response: true } },
        },
      })
    : null;

  // anyone without an invitation — including the merely curious — sees nothing
  if (!invitation) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <ChalkText size="line">{copy.errors.notFound}</ChalkText>
      </main>
    );
  }

  if (invitation.status === "SENT") {
    await prisma.eventInvitation.update({
      where: { id: invitation.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }

  const stem = await prisma.stemGuest.findFirst({
    where: { eventId: invitation.event.id, hostMemberId: memberId, deletedAt: null },
    select: { firstName: true },
  });

  const now = Date.now();
  const closed =
    (invitation.event.rsvpDeadline !== null && now > invitation.event.rsvpDeadline.getTime()) ||
    now > invitation.event.endsAt.getTime();

  const initial =
    invitation.rsvp?.response === "CONFIRMED"
      ? "CONFIRMED"
      : invitation.rsvp?.response === "DECLINED"
        ? "DECLINED"
        : closed
          ? "CLOSED"
          : "OPEN";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-8">
      <Reveal>
        <header className="flex flex-col items-center gap-4 pt-32 text-center">
          <MonoText>{invitation.event.index}</MonoText>
          <ChalkText as="h1" size="huge">
            {invitation.event.name}
          </ChalkText>
          <ChalkText size="small">{copy.landing.home}</ChalkText>
          <MonoText>{copy.landing.hours}</MonoText>
        </header>
      </Reveal>

      {/* a full screen of nothing */}
      <div className="flex flex-1 flex-col items-center justify-center py-40">
        <RsvpChoice
          eventId={invitation.event.id}
          initial={initial}
          readOnly={closed}
          stemsAllowed={invitation.event.stemsAllowed}
          stemFirstName={stem?.firstName ?? null}
        />
      </div>

      <Serial />
    </main>
  );
}
