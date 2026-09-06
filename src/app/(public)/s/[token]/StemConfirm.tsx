// CONFIRM YOUR PLACE — price, his phone answers, then the sheet. Nothing else revealed.
"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { TextAction } from "@/components/ui/TextAction";
import { OtpBoxes } from "@/components/ui/OtpBoxes";
import { Reveal } from "@/components/ui/Reveal";
import { stemCreateIntent, stemSendCode, stemVerifyCode } from "./actions";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Step = "CHOSEN" | "CODE" | "PAY" | "IN";

export function StemConfirm({
  token,
  phoneVerified,
  paid,
}: {
  token: string;
  phoneVerified: boolean;
  paid: boolean;
}) {
  const [step, setStep] = useState<Step>(paid ? "IN" : "CHOSEN");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<{
    clientSecret: string;
    providerRef: string;
    amountLabel: string;
  } | null>(null);

  async function begin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (!phoneVerified) {
      const res = await stemSendCode({ token });
      setBusy(false);
      if ("error" in res) return setError(res.error);
      setStep("CODE");
      return;
    }
    await toPayment();
  }

  async function toPayment() {
    setBusy(true);
    setError(null);
    const res = await stemCreateIntent({ token });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    if ("free" in res) return setStep("IN");
    setIntent(res);
    setStep("PAY");
  }

  async function verify(complete: string) {
    if (busy) return;
    setBusy(true);
    const res = await stemVerifyCode({ token, code: complete });
    if ("error" in res) {
      setBusy(false);
      setCode("");
      return setError(res.error);
    }
    await toPayment();
  }

  if (step === "IN") {
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-6 text-center">
          <ChalkText size="line">{copy.stemPublic.youreHerStem}</ChalkText>
          <ChalkText size="small">{copy.stemPublic.seeYouInside}</ChalkText>
        </div>
      </Reveal>
    );
  }

  if (step === "CODE") {
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-8">
          <ChalkText size="small">{copy.otp.enterWhatWeSent}</ChalkText>
          <OtpBoxes value={code} onChange={setCode} onComplete={verify} />
          {error ? <div className="field-error-line">{error}</div> : null}
        </div>
      </Reveal>
    );
  }

  if (step === "PAY" && intent) {
    return (
      <Reveal>
        <div className="flex w-full flex-col items-center gap-8">
          <MonoText dim={false}>{intent.amountLabel}</MonoText>
          {error ? <div className="field-error-line">{error}</div> : null}
          {stripePromise && !intent.clientSecret.startsWith("console-") ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: intent.clientSecret,
                appearance: {
                  variables: {
                    colorBackground: "#4a0e14",
                    colorText: "#e8e2d6",
                    colorDanger: "#e8e2d6",
                    fontFamily: "monospace",
                    borderRadius: "0px",
                  },
                },
              }}
            >
              <StripeSheet onDone={() => setStep("IN")} onError={setError} />
            </Elements>
          ) : (
            // dev (console provider): the sheet is a single action; PAID still
            // only ever happens through the webhook
            <TextAction
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await fetch("/api/payments/webhook", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "payment.succeeded",
                    providerRef: intent.providerRef,
                  }),
                });
                setBusy(false);
                setStep("IN");
              }}
            >
              {copy.stemPublic.coverIt}
            </TextAction>
          )}
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="flex flex-col items-center gap-6">
        {error ? <div className="field-error-line">{error}</div> : null}
        <TextAction disabled={busy} onClick={begin}>
          {copy.stemPublic.confirmYourPlace}
        </TextAction>
      </div>
    </Reveal>
  );
}

function StripeSheet({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex w-full flex-col items-center gap-8"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements || busy) return;
        setBusy(true);
        const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
        setBusy(false);
        if (error) return onError(copy.errors.wrongCode);
        onDone();
      }}
    >
      <PaymentElement />
      <TextAction type="submit" disabled={busy}>
        {copy.stemPublic.coverIt}
      </TextAction>
    </form>
  );
}
