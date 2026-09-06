// /terms — content arrives from the atelier settings pass; the page holds only its name
import { copy } from "@/content/copy";
import { MonoText } from "@/components/world/MonoText";
import { Serial } from "@/components/world/Serial";

export default function TermsPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-8">
      <MonoText>{copy.landing.terms}</MonoText>
      <Serial />
    </main>
  );
}
