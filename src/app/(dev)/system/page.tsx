// /system — dev-only wall showing every world component for review. Never ships to production.
// Strings on this page are review samples, whitelisted from the copy rule.
import { notFound } from "next/navigation";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { RoseMark } from "@/components/world/RoseMark";
import { Serial } from "@/components/world/Serial";
import { TextAction } from "@/components/ui/TextAction";
import { Reveal } from "@/components/ui/Reveal";

export default function SystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-24 px-8 py-24 pb-32">
      <Reveal>
        <ChalkText as="h1" size="huge">
          65
        </ChalkText>
        <RoseMark className="mt-6" />
      </Reveal>

      <div className="flex flex-col gap-10">
        <ChalkText size="line">EVERY ROSE GETS A ROSE.</ChalkText>
        <ChalkText size="line" className="self-end">
          WHO GETS YOUR STEM?
        </ChalkText>
        <ChalkText size="small">SHE&apos;S ON HER WAY.</ChalkText>
      </div>

      <div className="flex flex-col items-center gap-6">
        <MonoText>00—05</MonoText>
        <MonoText dim={false}>0065</MonoText>
        <MonoText>05:13</MonoText>
      </div>

      <div className="flex flex-col items-start gap-10">
        <TextAction href="/system">ENTER</TextAction>
        <TextAction href="/system" variant="quiet">
          NOT THIS TIME
        </TextAction>
        <TextAction disabled>YES</TextAction>
      </div>

      <Serial />
    </main>
  );
}
