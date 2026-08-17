// /enter/verify — the OTP step between password and a full member session
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { VerifyForm } from "./VerifyForm";

export default async function EnterVerifyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/enter");
  if (!session.user.memberId) redirect("/rose");

  const member = await prisma.memberProfile.findUnique({
    where: { id: session.user.memberId },
    select: { phoneVerified: true },
  });
  if (member?.phoneVerified) redirect("/rose");

  return <VerifyForm />;
}
