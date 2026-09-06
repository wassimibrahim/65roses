// ENTER WHAT WE SENT YOU. — six boxes, a quiet resend after 30 seconds
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/content/copy";
import { OtpBoxes } from "@/components/ui/OtpBoxes";
import { ChalkText } from "@/components/world/ChalkText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { confirmLoginCode, sendLoginCode } from "./actions";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(Date.now() + 30_000);
  const [, force] = useState(0);

  async function submit(complete: string) {
    if (busy) return;
    setBusy(true);
    const res = await confirmLoginCode({ code: complete });
    if ("error" in res) {
      setBusy(false);
      setCode("");
      return setError(res.error);
    }
    router.push("/rose");
    router.refresh();
  }

  const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
  if (remaining > 0) setTimeout(() => force((n) => n + 1), 1000);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8">
      <Reveal>
        <div className="flex flex-col gap-10">
          <ChalkText as="h1" size="line">
            {copy.otp.enterWhatWeSent}
          </ChalkText>
          <OtpBoxes value={code} onChange={setCode} onComplete={submit} />
          {error ? <div className="field-error-line">{error}</div> : null}
          {remaining > 0 ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.2em",
                color: "var(--chalk-dim)",
                opacity: 0.6,
              }}
            >
              {String(remaining).padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setError(null);
                await sendLoginCode();
                setResendAt(Date.now() + 30_000);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.2em",
                color: "var(--chalk-dim)",
              }}
            >
              {copy.otp.resend}
            </button>
          )}
        </div>
      </Reveal>
      <Serial />
    </main>
  );
}
