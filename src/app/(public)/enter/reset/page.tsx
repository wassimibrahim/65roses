// /enter/reset?t=<signed token> — new password or NOTHING HERE.
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { parseResetToken } from "@/lib/auth/reset-token";
import { ResetForm } from "./ResetForm";

export default async function EnterResetPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const userId = t ? parseResetToken(t) : null;

  if (!t || !userId) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-8">
        <ChalkText size="line">{copy.errors.notFound}</ChalkText>
      </main>
    );
  }

  return <ResetForm token={t} />;
}
