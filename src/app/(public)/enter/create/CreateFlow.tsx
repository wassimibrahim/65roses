// account creation — three screens: password, phone, code. Strength is a hairline, never advice.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { copy } from "@/content/copy";
import { Field } from "@/components/ui/Field";
import { OtpBoxes } from "@/components/ui/OtpBoxes";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { confirmCreateCode, sendCreateCode, setPassword } from "./actions";

function strengthOf(password: string): number {
  let score = Math.min(password.length / 16, 0.6);
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 0.13;
  if (/\d/.test(password)) score += 0.13;
  if (/[^A-Za-z0-9]/.test(password)) score += 0.14;
  return Math.min(score, 1);
}

export function CreateFlow({ token, phonePrefill }: { token: string; phonePrefill: string }) {
  const router = useRouter();
  const [screen, setScreen] = useState<"password" | "phone" | "code">("password");
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState(phonePrefill);
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword() {
    if (busy) return;
    setBusy(true);
    const res = await setPassword({ t: token, password, confirm });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setScreen("phone");
  }

  async function submitPhone() {
    if (busy) return;
    setBusy(true);
    const res = await sendCreateCode({ t: token, phone });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setResendAt(Date.now() + 30_000);
    setScreen("code");
  }

  async function submitCode(complete?: string) {
    if (busy) return;
    setBusy(true);
    const res = await confirmCreateCode({ t: token, phone, code: complete ?? code });
    if ("error" in res) {
      setBusy(false);
      setCode("");
      return setError(res.error);
    }
    await signIn("credentials", { redirect: false, email: res.email, password });
    router.push("/rose");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8">
      {screen === "password" ? (
        <Reveal key="password">
          <div className="flex flex-col gap-10">
            <ChalkText as="h1" size="line">
              {copy.account.yourNumberIsYours}
            </ChalkText>
            <form
              className="flex flex-col gap-8"
              onSubmit={(e) => {
                e.preventDefault();
                submitPassword();
              }}
            >
              <div>
                <Field
                  id="password"
                  label={copy.account.password}
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setError(null);
                    setPasswordValue(e.target.value);
                  }}
                />
                {/* strength: a hairline that fills. No nagging. */}
                <div
                  className="mt-2"
                  style={{
                    height: 1,
                    width: `${strengthOf(password) * 100}%`,
                    background: "var(--chalk)",
                    opacity: 0.6,
                    transition: "width 400ms var(--ease-65)",
                  }}
                />
              </div>
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
      ) : null}

      {screen === "phone" ? (
        <Reveal key="phone">
          <div className="flex flex-col gap-10">
            <ChalkText as="h1" size="line">
              {copy.account.phoneTellsUs}
            </ChalkText>
            <form
              className="flex flex-col gap-8"
              onSubmit={(e) => {
                e.preventDefault();
                submitPhone();
              }}
            >
              <Field
                id="phone"
                label={copy.apply.fields.mobile}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                error={error ?? undefined}
                value={phone}
                onChange={(e) => {
                  setError(null);
                  setPhone(e.target.value);
                }}
              />
              <div>
                <TextAction type="submit" size="small" disabled={busy}>
                  {copy.account.sendCode}
                </TextAction>
              </div>
            </form>
          </div>
        </Reveal>
      ) : null}

      {screen === "code" ? (
        <Reveal key="code">
          <div className="flex flex-col gap-10">
            <ChalkText as="h1" size="line">
              {copy.otp.enterWhatWeSent}
            </ChalkText>
            <OtpBoxes value={code} onChange={setCode} onComplete={(c) => submitCode(c)} />
            {error ? <div className="field-error-line">{error}</div> : null}
            <ResendLine
              resendAt={resendAt}
              onResend={() => {
                setError(null);
                submitPhone();
              }}
            />
          </div>
        </Reveal>
      ) : null}

      <Serial />
    </main>
  );
}

function ResendLine({ resendAt, onResend }: { resendAt: number; onResend: () => void }) {
  const [, force] = useState(0);
  const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));

  if (remaining > 0) {
    setTimeout(() => force((n) => n + 1), 1000);
    return (
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
    );
  }

  return (
    <button
      type="button"
      onClick={onResend}
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
  );
}
