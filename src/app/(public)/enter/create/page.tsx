// /enter/create?t=<token> — she claims her account. Token invalid → NOTHING HERE.
// Already has a password → /enter.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { CreateFlow } from "./CreateFlow";

export default async function EnterCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  const app = t
    ? await prisma.application.findUnique({
        where: { welcomeToken: t },
        select: {
          phone: true,
          welcomeTokenExp: true,
          member: { select: { user: { select: { passwordHash: true } } } },
        },
      })
    : null;

  if (app?.member?.user.passwordHash) redirect("/enter");

  if (!t || !app?.member || !app.welcomeTokenExp || app.welcomeTokenExp.getTime() < Date.now()) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <ChalkText size="line">{copy.errors.notFound}</ChalkText>
      </main>
    );
  }

  return <CreateFlow token={t} phonePrefill={app.phone} />;
}
