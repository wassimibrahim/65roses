// /s/[token] — his page. Public, tokened, aggressively rate limited.
// He sees the night, the hours, her FIRST name. Nothing else exists here.
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { consume, presets } from "@/lib/rate-limit";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Serial } from "@/components/world/Serial";
import { Reveal } from "@/components/ui/Reveal";
import { StemConfirm } from "./StemConfirm";

function Bare({ line }: { line: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-8">
      <ChalkText size="line">{line}</ChalkText>
    </main>
  );
}

export default async function StemPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const byToken = await consume(prisma, presets.stemLinkPerToken, token);
  const byIp = await consume(prisma, presets.stemLinkPerIp, ip);
  if (!byToken.allowed || !byIp.allowed) return <Bare line={copy.errors.rateLimited} />;

  // the select IS the privacy boundary: her first name, the night, the hours. Nothing else.
  const stem = await prisma.stemGuest.findUnique({
    where: { token },
    select: {
      id: true,
      firstName: true,
      phoneVerified: true,
      paymentStatus: true,
      tokenExpiresAt: true,
      deletedAt: true,
      openedAt: true,
      hostMember: { select: { firstName: true } },
      event: { select: { name: true, endsAt: true } },
    },
  });

  if (!stem) return <Bare line={copy.errors.notFound} />;
  if (
    stem.deletedAt ||
    (stem.tokenExpiresAt && stem.tokenExpiresAt.getTime() < Date.now()) ||
    stem.event.endsAt.getTime() < Date.now()
  ) {
    return <Bare line={copy.errors.expired} />;
  }

  if (!stem.openedAt) {
    await prisma.stemGuest.update({
      where: { id: stem.id },
      data: { openedAt: new Date() },
    });
  }

  const paid = stem.paymentStatus === "PAID";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-8">
      <Reveal>
        <header className="flex flex-col items-center gap-5 pt-32 text-center">
          <ChalkText as="h1" size="line">
            {copy.stemPublic.chosen}
          </ChalkText>
          <ChalkText size="huge">{stem.event.name}</ChalkText>
          <MonoText>{copy.landing.hours}</MonoText>
          <MonoText>
            {copy.stemPublic.by} {stem.hostMember.firstName.toUpperCase()}
          </MonoText>
        </header>
      </Reveal>

      <div className="flex flex-1 flex-col items-center justify-center py-32">
        <StemConfirm token={token} phoneVerified={stem.phoneVerified} paid={paid} />
      </div>

      <Serial />
    </main>
  );
}
