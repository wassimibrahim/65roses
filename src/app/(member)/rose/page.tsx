// /rose — her page. Not a dashboard: her number, her name, one thing at a time.
import { redirect } from "next/navigation";
import { copy } from "@/content/copy";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { getRoseHomeData } from "@/lib/dto/rose-home";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { TextAction } from "@/components/ui/TextAction";
import { Reveal } from "@/components/ui/Reveal";
import { RoseNav } from "./RoseNav";
import { WakeButton } from "./WakeButton";

export default async function RoseHomePage() {
  let memberId: string | undefined;
  try {
    const user = await requireVerifiedPhone();
    memberId = user.memberId;
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }
  if (!memberId) redirect("/atelier"); // staff have no rose page

  const data = await getRoseHomeData(prisma, memberId);
  if (!data) redirect("/enter");

  const { member, night, needsAddress } = data;
  const statusWord =
    member.status === "ACTIVE"
      ? copy.status.active
      : member.status === "QUIET"
        ? copy.status.quiet
        : copy.status.paused;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-8">
      {/* her card — the only gold on this page is her number */}
      <Reveal>
        <header className="flex flex-col items-center gap-3 pt-36 text-center">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.4em",
              fontSize: "0.85rem",
              color: "var(--gold)",
            }}
          >
            {member.memberNumber}
          </span>
          <ChalkText as="h1" size="line">
            {member.firstName}
          </ChalkText>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.3em",
              fontSize: "0.65rem",
              opacity: 0.45,
            }}
          >
            {statusWord}
          </span>
          {member.status === "QUIET" ? (
            <div className="mt-6 flex flex-col items-center gap-4">
              <ChalkText size="small">{copy.roseHome.roseIsQuiet}</ChalkText>
              <WakeButton />
            </div>
          ) : null}
          {member.status === "PAUSED" ? (
            <div className="mt-6">
              <MonoText>{copy.status.pausedContact}</MonoText>
            </div>
          ) : null}
          {/* her Rose is made and has nowhere to go — one quiet line, once */}
          {needsAddress && member.status !== "PAUSED" ? (
            <div className="mt-8">
              <TextAction href="/rose/delivery" variant="quiet" size="small">
                {copy.delivery.whereShouldSheFindYou}
              </TextAction>
            </div>
          ) : null}
        </header>
      </Reveal>

      {/* a full screen of nothing, then the one thing */}
      <div className="flex flex-1 flex-col items-center justify-center py-40">
        {member.status !== "PAUSED" && night ? (
          night.state === "OPEN" ? (
            <Reveal>
              <div className="flex flex-col items-center gap-4 text-center">
                <MonoText>{night.index}</MonoText>
                <ChalkText as="h2" size="huge">
                  {night.name}
                </ChalkText>
                <ChalkText size="small">{copy.landing.home}</ChalkText>
                <MonoText>{night.hours}</MonoText>
                <div className="mt-10 flex flex-col items-center gap-6">
                  <TextAction href={`/rose/nights/${night.slug}`}>
                    {copy.roseHome.confirm}
                  </TextAction>
                  <TextAction href={`/rose/nights/${night.slug}`} variant="quiet" size="small">
                    {copy.roseHome.notThisTime}
                  </TextAction>
                </div>
              </div>
            </Reveal>
          ) : night.state === "CONFIRMED" ? (
            <Reveal>
              <div className="flex flex-col items-center gap-8 text-center">
                <ChalkText size="line">{copy.roseHome.wellSeeYou}</ChalkText>
                {night.stemFirstName ? (
                  <ChalkText size="small">{night.stemFirstName}</ChalkText>
                ) : night.stemsAllowed ? (
                  <TextAction href={`/rose/stem/${night.eventId}`} size="small">
                    {copy.roseHome.chooseYourStem}
                  </TextAction>
                ) : null}
              </div>
            </Reveal>
          ) : (
            <TextAction href="/rose/nights" variant="quiet" size="small">
              {copy.roseHome.yourNights}
            </TextAction>
          )
        ) : (
          <TextAction href="/rose/nights" variant="quiet" size="small">
            {copy.roseHome.yourNights}
          </TextAction>
        )}
      </div>

      <RoseNav />
    </main>
  );
}
