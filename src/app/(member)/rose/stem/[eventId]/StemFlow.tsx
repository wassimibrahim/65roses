// YOUR STEM. YOUR DECISION. — she registers him, then hands him his link herself
"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { Field } from "@/components/ui/Field";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Reveal } from "@/components/ui/Reveal";
import { registerStem, replaceStem } from "./actions";

interface ShareState {
  firstName: string;
  token: string;
}

export function StemFlow({
  eventId,
  eventName,
  canReplace,
  existing,
  appUrl,
}: {
  eventId: string;
  eventName: string;
  canReplace: boolean;
  existing: ShareState | null;
  appUrl: string;
}) {
  const [share, setShare] = useState<ShareState | null>(existing);
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    mobile: "+961",
    instagram: "",
    email: "",
    dateOfBirth: "",
    note: "",
  });
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (share) {
    const link = `${appUrl}/s/${share.token}`;
    const message = `${eventName}. ${copy.landing.hours}.\n${link}`;
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-8 text-center">
          <ChalkText size="huge">{share.firstName}</ChalkText>
          <TextAction href={`https://wa.me/?text=${encodeURIComponent(message)}`}>
            {copy.stem.sendHimHisLink}
          </TextAction>
          <a
            href={`sms:?&body=${encodeURIComponent(message)}`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.2em",
              color: "var(--chalk-dim)",
            }}
          >
            {copy.stem.sms}
          </a>
          <MonoText>{link.replace(/^https?:\/\//, "")}</MonoText>
          {/* the rule she needs, where she needs it: he now holds a link and
              will have questions, and they are hers to answer */}
          <div className="mt-6">
            <ChalkText size="small">{copy.stem.heCantAskUs}</ChalkText>
          </div>
          {canReplace ? (
            <TextAction
              variant="quiet"
              size="small"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                const res = await replaceStem(eventId);
                setBusy(false);
                if (res.ok) setShare(null);
              }}
            >
              {copy.stem.chooseAgain}
            </TextAction>
          ) : null}
        </div>
      </Reveal>
    );
  }

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(false);
    setValues({ ...values, [key]: e.target.value });
  };

  return (
    <Reveal>
      <div className="flex flex-col gap-10">
        <div>
          <ChalkText as="h1" size="line">
            {copy.stem.yourDecision}
          </ChalkText>
        </div>
        <form
          className="flex flex-col gap-7"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            const res = await registerStem(eventId, values);
            setBusy(false);
            if ("error" in res) return setError(true);
            setShare({ firstName: res.firstName, token: res.token });
          }}
        >
          <Field
            id="firstName"
            label={copy.apply.fields.firstName}
            autoFocus
            value={values.firstName}
            onChange={set("firstName")}
          />
          <Field
            id="lastName"
            label={copy.apply.fields.lastName}
            value={values.lastName}
            onChange={set("lastName")}
          />
          <Field
            id="mobile"
            label={copy.apply.fields.mobile}
            type="tel"
            inputMode="tel"
            value={values.mobile}
            onChange={set("mobile")}
          />
          <Field
            id="instagram"
            label={copy.apply.fields.instagram}
            value={values.instagram}
            onChange={set("instagram")}
          />
          <Field
            id="email"
            label={copy.apply.fields.email}
            type="email"
            inputMode="email"
            value={values.email}
            onChange={set("email")}
          />
          <Field
            id="dateOfBirth"
            label={copy.apply.fields.dateOfBirth}
            type="date"
            value={values.dateOfBirth}
            onChange={set("dateOfBirth")}
          />
          <Field
            id="note"
            label={copy.stem.howDoYouKnowHim}
            maxLength={200}
            error={error ? copy.apply.errors.required : undefined}
            value={values.note}
            onChange={set("note")}
          />
          <div className="mt-4">
            <TextAction type="submit" size="small" disabled={busy}>
              {copy.landing.enter}
            </TextAction>
          </div>
        </form>
      </div>
    </Reveal>
  );
}
