// /welcome?t=<token> — the most important screen in the product.
// Invalid or expired token: a bare NOTHING HERE. Consumed with an account: /enter.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { WelcomeSequence } from "./WelcomeSequence";

function NothingHere() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-8">
      <ChalkText size="line">{copy.errors.notFound}</ChalkText>
    </main>
  );
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  if (!t) return <NothingHere />;

  const application = await prisma.application.findUnique({
    where: { welcomeToken: t },
    select: {
      id: true,
      welcomeTokenExp: true,
      welcomeSeenAt: true,
      member: {
        select: { memberNumber: true, user: { select: { passwordHash: true } } },
      },
    },
  });

  if (!application?.member) return <NothingHere />;

  // the token was consumed at account creation — she already lives at /enter
  if (application.member.user.passwordHash) redirect("/enter");

  if (!application.welcomeTokenExp || application.welcomeTokenExp.getTime() < Date.now()) {
    return <NothingHere />;
  }

  if (!application.welcomeSeenAt) {
    await prisma.application.update({
      where: { id: application.id },
      data: { welcomeSeenAt: new Date() },
    });
  }

  return <WelcomeSequence memberNumber={application.member.memberNumber} token={t} />;
}
