// /rose/nights — YOUR NIGHTS.
//
// Names, chalk, large, newest at the bottom so it reads like something that is
// still growing. The rose glyph marks a night she came to. A night she was
// invited to and missed is here, plain, without comment. A night she was never
// invited to is not here at all.
//
// No dates. No times. No venue. No count. Tapping a name does nothing — this
// is a memory, not a receipt.
import { redirect } from "next/navigation";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { ChalkText } from "@/components/world/ChalkText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { RoseNav } from "../RoseNav";

export default async function NightsPage() {
  let memberId: string | undefined;
  try {
    const user = await requireVerifiedPhone();
    memberId = user.memberId;
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }
  if (!memberId) redirect("/atelier");

  // only nights she was invited to, oldest first — the list grows downward
  const invitations = await prisma.eventInvitation.findMany({
    where: {
      memberId,
      // a night still happening is not a memory yet
      event: {
        deletedAt: null,
        status: { notIn: ["DRAFT", "CANCELLED"] },
        endsAt: { lt: new Date() },
      },
    },
    orderBy: { event: { startsAt: "asc" } },
    select: {
      id: true,
      event: { select: { name: true } },
      rsvp: { select: { outcome: true } },
    },
  });

  const nights = invitations.map((invitation) => ({
    id: invitation.id,
    name: invitation.event.name,
    attended: invitation.rsvp?.outcome === "ATTENDED",
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-8 py-32">
      {nights.length > 0 ? (
        <Reveal>
          <ul className="flex flex-col gap-12">
            {nights.map((night) => (
              <li key={night.id}>
                <ChalkText size="line">{night.attended ? `${night.name} 🌹` : night.name}</ChalkText>
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}
      <Serial />
      <RoseNav />
    </main>
  );
}
