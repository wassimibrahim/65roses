// the landing — one column of oxblood. Five breaths, two doors in, nothing explained.
//
// The home line is BEIRUT. A second city appears here only once it has a night,
// and it appears as another line, never as a selector: she is not asked to
// choose a city, she is told where the world is.
import { prisma } from "@/lib/db/client";
import { announcedCities, CITY_LINE } from "@/lib/cities";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { RoseMark } from "@/components/world/RoseMark";
import { Serial } from "@/components/world/Serial";
import { TextAction } from "@/components/ui/TextAction";
import { FadeIn } from "@/components/ui/FadeIn";

export default async function LandingPage() {
  const cities = await announcedCities(prisma);

  return (
    <main className="mx-auto max-w-xl">
      {/* hero */}
      <FadeIn>
        <section className="flex min-h-dvh flex-col items-center justify-between px-8 py-16">
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <ChalkText as="h1" size="huge">
              {copy.landing.mark}
            </ChalkText>
            <RoseMark />
            <div className="mt-24 flex flex-col items-center gap-3">
              {cities.map((city) => (
                <ChalkText key={city} size="line">
                  {CITY_LINE[city]}
                </ChalkText>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 pb-4">
            <TextAction href="/apply">{copy.landing.enter}</TextAction>
            <span style={{ opacity: 0.4 }}>
              <MonoText dim={false}>{copy.landing.forRoses}</MonoText>
            </span>
          </div>
        </section>
      </FadeIn>

      {/* every rose gets a rose */}
      <FadeIn>
        <section className="flex min-h-dvh items-center px-8">
          <div style={{ maxWidth: "11ch" }}>
            <ChalkText as="h2" size="line">
              {copy.landing.everyRose}
            </ChalkText>
          </div>
        </section>
      </FadeIn>

      {/* who gets your stem */}
      <FadeIn>
        <section className="flex min-h-dvh items-center justify-end px-8 text-right">
          <div style={{ maxWidth: "10ch" }}>
            <ChalkText as="h2" size="line">
              {copy.landing.whoGetsYourStem}
            </ChalkText>
          </div>
        </section>
      </FadeIn>

      {/* 00—05 */}
      <FadeIn>
        <section className="flex min-h-dvh items-center justify-center">
          <MonoText>{copy.landing.hours}</MonoText>
        </section>
      </FadeIn>

      {/* closing */}
      <FadeIn>
        <section className="relative flex min-h-dvh flex-col items-center justify-center px-8">
          <TextAction href="/apply">{copy.landing.requestAccess}</TextAction>
          <footer className="absolute bottom-16 flex gap-10" style={{ opacity: 0.35 }}>
            <a href="/privacy">
              <MonoText dim={false}>{copy.landing.privacy}</MonoText>
            </a>
            <a href="/terms">
              <MonoText dim={false}>{copy.landing.terms}</MonoText>
            </a>
          </footer>
          <Serial />
        </section>
      </FadeIn>
    </main>
  );
}
