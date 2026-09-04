// /door — the door interface: one hand, in the dark, on bad reception.
// The session is scoped to whichever night's window is open right now.
import { notFound } from "next/navigation";
import { AuthError, requireDoor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { doorState } from "@/lib/door/roster";
import { tonight } from "@/lib/door/tonight";
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

  const event = await tonight(prisma);
  if (!event) notFound();

  return <DoorApp initial={await doorState(prisma, event.id)} />;
}
