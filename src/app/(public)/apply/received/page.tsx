// /apply/received — WE HAVE YOU. Nothing else. No confetti, no inbox nudge, no way back.
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Serial } from "@/components/world/Serial";
import { Reveal } from "@/components/ui/Reveal";

export default function ApplyReceivedPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8">
      <Reveal>
        <ChalkText as="h1" size="line">
          {copy.applyReceived.weHaveYou}
        </ChalkText>
      </Reveal>
      <MonoText>{copy.applyReceived.inTouch}</MonoText>
      <Serial />
    </main>
  );
}
