// the application — one question visible at a time, advancing on answer.
// Progress is a hairline that grows. No step counts, no percentages.
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { copy } from "@/content/copy";
import { BEIRUT_AREAS } from "@/content/areas";
import { normalizeInstagram, normalizePhone, isAdult } from "@/lib/validation/apply";
import { Field } from "@/components/ui/Field";
import { Choice } from "@/components/ui/Choice";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";

type StepKey =
  | "firstName"
  | "lastName"
  | "instagram"
  | "email"
  | "mobile"
  | "dateOfBirth"
  | "area"
  | "howFound"
  | "knowARose";

interface Step {
  key: StepKey;
  label: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  maxLength?: number;
  optional?: boolean;
  listId?: string;
  validate?: (value: string) => string | null;
}

const err = copy.apply.errors;

const STEPS: Step[] = [
  { key: "firstName", label: copy.apply.fields.firstName, autoComplete: "given-name" },
  { key: "lastName", label: copy.apply.fields.lastName, autoComplete: "family-name" },
  {
    key: "instagram",
    label: copy.apply.fields.instagram,
    validate: (v) => (/^[a-z0-9._]{1,30}$/.test(normalizeInstagram(v)) ? null : err.instagram),
  },
  {
    key: "email",
    label: copy.apply.fields.email,
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : err.email),
  },
  {
    key: "mobile",
    label: copy.apply.fields.mobile,
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel",
    validate: (v) => (normalizePhone(v) ? null : err.phone),
  },
  { key: "dateOfBirth", label: copy.apply.fields.dateOfBirth, type: "date" },
  { key: "area", label: copy.apply.fields.area, optional: true, listId: "areas" },
  {
    key: "howFound",
    label: copy.apply.fields.howFound,
    optional: true,
    maxLength: 280,
  },
  { key: "knowARose", label: copy.apply.fields.knowARose, optional: true, maxLength: 60 },
];

const CONSENTS = [
  ["adult", copy.apply.consent.adult],
  ["houseRules", copy.apply.consent.houseRules],
  ["messaging", copy.apply.consent.messaging],
  ["privacy", copy.apply.consent.privacy],
] as const;

export function ApplyFlow() {
  const router = useRouter();
  const fastTrack = useSearchParams().get("r") ?? "";
  const startedAt = useMemo(() => Date.now(), []);
  const [values, setValues] = useState<Record<StepKey, string>>({
    firstName: "",
    lastName: "",
    instagram: "",
    email: "",
    mobile: "+961",
    dateOfBirth: "",
    area: "",
    howFound: "",
    knowARose: "",
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [consents, setConsents] = useState({
    adult: false,
    houseRules: false,
    messaging: false,
    privacy: false,
  });
  const [underage, setUnderage] = useState(false);
  const [sending, setSending] = useState(false);
  const honeypot = useRef("");

  // steps + consent screen; the hairline grows across all of it
  const totalScreens = STEPS.length + 1;
  const progress = (Math.min(step, totalScreens) / totalScreens) * 100;

  if (underage) {
    return (
      <Reveal>
        <main className="flex min-h-dvh items-center justify-center px-8">
          <ChalkText size="line">{copy.apply.underage}</ChalkText>
          <Serial />
        </main>
      </Reveal>
    );
  }

  const current = STEPS[step];

  function advance() {
    if (!current) return;
    const value = values[current.key];
    if (!current.optional && value.trim() === "") {
      setError(err.required);
      return;
    }
    if (value.trim() !== "" && current.validate) {
      const problem = current.validate(value);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (current.key === "dateOfBirth") {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) {
        setError(err.required);
        return;
      }
      if (!isAdult(dob)) {
        setUnderage(true);
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: values.firstName,
        lastName: values.lastName,
        instagram: values.instagram,
        email: values.email,
        mobile: values.mobile,
        dateOfBirth: values.dateOfBirth,
        area: values.area,
        howFound: values.howFound,
        knowARose: values.knowARose,
        consents,
        r: fastTrack,
        website: honeypot.current,
        startedAt,
      }),
    }).catch(() => null);
    if (res?.ok) {
      router.push("/apply/received");
      return;
    }
    setSending(false);
    setError(res?.status === 429 ? copy.errors.rateLimited : copy.errors.wrongCode);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-8 py-24">
      <div className="hairline-progress" style={{ width: `${progress}%` }} />

      {current ? (
        <form
          key={current.key}
          onSubmit={(e) => {
            e.preventDefault();
            advance();
          }}
        >
          <Reveal>
            <Field
              id={current.key}
              label={current.label}
              error={error ?? undefined}
              type={current.type ?? "text"}
              inputMode={current.inputMode}
              autoComplete={current.autoComplete}
              maxLength={current.maxLength}
              listId={current.listId}
              autoFocus
              value={values[current.key]}
              onChange={(e) => {
                setError(null);
                setValues({ ...values, [current.key]: e.target.value });
              }}
            />
            {current.listId === "areas" ? (
              <datalist id="areas">
                {BEIRUT_AREAS.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            ) : null}
            {/* honeypot — invisible to humans, tempting to bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-5000px", opacity: 0 }}
              onChange={(e) => (honeypot.current = e.target.value)}
            />
            <div className="mt-12">
              <TextAction type="submit" size="small">
                {copy.landing.enter}
              </TextAction>
            </div>
          </Reveal>
        </form>
      ) : (
        <Reveal>
          <div className="flex flex-col gap-7">
            {CONSENTS.map(([key, label]) => (
              <Choice
                key={key}
                label={label}
                checked={consents[key]}
                onChange={(next) => setConsents({ ...consents, [key]: next })}
              />
            ))}
            {error ? <div className="field-error-line">{error}</div> : null}
            <div className="mt-10">
              <TextAction
                onClick={submit}
                disabled={sending || !Object.values(consents).every(Boolean)}
              >
                {copy.apply.submit}
              </TextAction>
            </div>
          </div>
        </Reveal>
      )}
    </main>
  );
}
