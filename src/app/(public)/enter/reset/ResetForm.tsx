// reset — the password screens again, from a signed link
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/content/copy";
import { Field } from "@/components/ui/Field";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { resetPassword } from "../forgot/actions";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8">
      <Reveal>
        <div className="flex flex-col gap-10">
          <ChalkText as="h1" size="line">
            {copy.account.yourNumberIsYours}
          </ChalkText>
          <form
            className="flex flex-col gap-8"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              const res = await resetPassword({ t: token, password, confirm });
              if ("error" in res) {
                setBusy(false);
                return setError(res.error);
              }
              router.push("/enter");
            }}
          >
            <Field
              id="password"
              label={copy.account.password}
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setError(null);
                setPassword(e.target.value);
              }}
            />
            <Field
              id="confirm"
              label={copy.account.passwordAgain}
              type="password"
              autoComplete="new-password"
              error={error ?? undefined}
              value={confirm}
              onChange={(e) => {
                setError(null);
                setConfirm(e.target.value);
              }}
            />
            <div>
              <TextAction type="submit" size="small" disabled={busy}>
                {copy.landing.enter}
              </TextAction>
            </div>
          </form>
        </div>
      </Reveal>
      <Serial />
    </main>
  );
}
