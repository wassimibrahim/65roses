// /door — the door interface: one hand, in the dark, on bad reception.
//
// The session is scoped to whichever night's window is open right now. Once
// there is more than one city, two windows overlap, so the host chooses once
// and the choice sticks for the night.
import { notFound } from "next/navigation";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { doorState } from "@/lib/door/roster";
import { openTonight, tonight } from "@/lib/door/tonight";
import { doorCity, setDoorCity } from "@/lib/door/session";
import { copy } from "@/content/copy";
import { CITY_LINE } from "@/lib/cities";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Reveal } from "@/components/ui/Reveal";
import { DoorApp } from "./DoorApp";

export const dynamic = "force-dynamic";

export default async function DoorPage() {
  try {
    await requireDoor();
  } catch (err) {
    // a wrong role is told the page does not exist, never that it is forbidden
    if (err instanceof AuthError) notFound();
    throw err;
  }

  const city = await doorCity();
  const open = await openTonight(prisma);
  if (open.length === 0) notFound();

  // two cities awake at once and nobody has said which door this is
  if (!city && open.length > 1) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-12 px-6">
        <Reveal>
          <div className="flex flex-col items-center gap-10">
            <MonoText>{copy.atelier.nav.city}</MonoText>
            {/* the choice is a city, so the city is what it says; the night's
                name sits under it as confirmation, not as the button */}
            {[...new Map(open.map((n) => [n.city, n])).values()].map((night) => (
              <form
                key={night.city}
                action={async () => {
                  "use server";
                  await setDoorCity(night.city);
                }}
              >
                <button type="submit" className="flex flex-col items-center gap-2">
                  <ChalkText size="line">{CITY_LINE[night.city]}</ChalkText>
                  <MonoText>{night.name}</MonoText>
                </button>
              </form>
            ))}
          </div>
        </Reveal>
      </main>
    );
  }

  const event = (await tonight(prisma, new Date(), city)) ?? open[0];
  if (!event) notFound();

  return <DoorApp initial={await doorState(prisma, event.id)} />;
}
