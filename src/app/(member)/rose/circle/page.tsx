// /rose/circle — the WhatsApp community, gated by ACTIVE status + verified phone.
//
// If she is not ACTIVE she sees her status word and nothing else: no
// explanation, no appeal button, no hint that a link exists. The link is never
// in this page's payload under any status — JOIN goes and gets it.
import { redirect } from "next/navigation";
import { AuthError, requireVerifiedPhone } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { toStatusWord } from "@/lib/dto/member";
import { copy } from "@/content/copy";
import { MonoText } from "@/components/world/MonoText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { CircleJoin } from "./CircleJoin";

export default async function CirclePage() {
  let memberId: string | undefined;
  try {
    const user = await requireVerifiedPhone();
    memberId = user.memberId;
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") redirect("/enter");
    redirect("/enter/verify");
  }
  if (!memberId) redirect("/atelier");

  const member = await prisma.memberProfile.findUniqueOrThrow({
    where: { id: memberId },
    select: { status: true, phoneVerified: true },
  });

  if (member.status !== "ACTIVE" || !member.phoneVerified) {
    const word = toStatusWord(member.status);
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <Reveal>
          <MonoText>
            {word === "ACTIVE"
              ? copy.status.active
              : word === "QUIET"
                ? copy.status.quiet
                : copy.status.paused}
          </MonoText>
        </Reveal>
        <Serial />
      </main>
    );
  }

  return <CircleJoin />;
}
