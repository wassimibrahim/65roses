// login — email and password, one failure message for everything: NOT IT.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { copy } from "@/content/copy";
import { Field } from "@/components/ui/Field";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { Serial } from "@/components/world/Serial";

export function EnterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (sending) return;
    setSending(true);
    const res = await signIn("credentials", { redirect: false, email, password }).catch(() => null);
    if (res && !res.error) {
      router.push("/rose");
      router.refresh();
      return;
    }
    setSending(false);
    setError(copy.errors.failedLogin);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8">
      <ChalkText as="h1" size="line">
        {copy.landing.mark}
      </ChalkText>
      <form
        className="flex flex-col gap-10"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          id="email"
          label={copy.enter.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setError(null);
            setEmail(e.target.value);
          }}
        />
        <Field
          id="password"
          label={copy.enter.password}
          type="password"
          autoComplete="current-password"
          error={error ?? undefined}
          value={password}
          onChange={(e) => {
            setError(null);
            setPassword(e.target.value);
          }}
        />
        <div>
          <TextAction type="submit" size="small" disabled={sending}>
            {copy.landing.enter}
          </TextAction>
        </div>
      </form>
      <Serial />
    </main>
  );
}
