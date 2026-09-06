// WHERE SHOULD YOUR ROSE FIND YOU? — one screen, then she is done with it.
"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { BEIRUT_AREAS } from "@/content/areas";
import { Field } from "@/components/ui/Field";
import { TextAction } from "@/components/ui/TextAction";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { Reveal } from "@/components/ui/Reveal";
import { Serial } from "@/components/world/Serial";
import { saveDeliveryAddress } from "./actions";

export interface DeliveryView {
  // what she is shown afterwards: AREA, CITY. Never the line itself.
  where: string | null;
  onHerWay: boolean;
  delivered: boolean;
  prefill: { recipientName: string; phone: string; city: "BEIRUT" | "MADRID" };
}

export function DeliveryForm({ view }: { view: DeliveryView }) {
  const [editing, setEditing] = useState(view.where === null);
  const [values, setValues] = useState({
    recipientName: view.prefill.recipientName,
    phone: view.prefill.phone,
    city: view.prefill.city,
    area: "",
    addressLine: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (view.delivered && !editing) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8">
        <Reveal>
          <div className="flex flex-col items-center gap-6 text-center">
            <ChalkText size="line">{copy.delivery.sheFoundYou}</ChalkText>
            <ChalkText size="small">{copy.delivery.dontLoseHer}</ChalkText>
          </div>
        </Reveal>
        <Serial />
      </main>
    );
  }

  if (sent || (!editing && view.onHerWay)) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-8">
        <Reveal>
          <ChalkText size="line">{copy.delivery.onHerWay}</ChalkText>
        </Reveal>
        {view.where ? (
          <div className="flex flex-col items-center gap-4">
            <MonoText>{view.where}</MonoText>
            <TextAction variant="quiet" size="small" onClick={() => setEditing(true)}>
              {copy.delivery.edit}
            </TextAction>
          </div>
        ) : null}
        <Serial />
      </main>
    );
  }

  if (!editing && view.where) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-8">
        <Reveal>
          <div className="flex flex-col items-center gap-6">
            <MonoText>{view.where}</MonoText>
            <TextAction variant="quiet" size="small" onClick={() => setEditing(true)}>
              {copy.delivery.edit}
            </TextAction>
          </div>
        </Reveal>
        <Serial />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-8 py-24">
      <Reveal>
        <ChalkText as="h1" size="line">
          {copy.delivery.whereShouldSheFindYou}
        </ChalkText>
      </Reveal>

      <form
        className="flex flex-col gap-8"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const result = await saveDeliveryAddress(values);
          if (result.ok) {
            setSent(true);
            return;
          }
          setBusy(false);
          setError(copy.apply.errors.required);
        }}
      >
        <Field
          id="recipientName"
          label={copy.delivery.recipient}
          value={values.recipientName}
          onChange={(e) => setValues({ ...values, recipientName: e.target.value })}
        />
        <Field
          id="phone"
          label={copy.apply.fields.mobile}
          type="tel"
          inputMode="tel"
          value={values.phone}
          onChange={(e) => setValues({ ...values, phone: e.target.value })}
        />
        <div className="flex flex-col gap-3">
          <span className="field-label">{copy.delivery.city}</span>
          <div className="flex gap-6">
            {(["BEIRUT", "MADRID"] as const).map((city) => (
              <TextAction
                key={city}
                size="small"
                variant={values.city === city ? "primary" : "quiet"}
                onClick={() => setValues({ ...values, city })}
              >
                {city}
              </TextAction>
            ))}
          </div>
        </div>
        <Field
          id="area"
          label={copy.delivery.area}
          listId="areas"
          value={values.area}
          onChange={(e) => setValues({ ...values, area: e.target.value })}
        />
        <datalist id="areas">
          {BEIRUT_AREAS.map((area) => (
            <option key={area} value={area} />
          ))}
        </datalist>
        <Field
          id="addressLine"
          label={copy.delivery.address}
          maxLength={400}
          error={error ?? undefined}
          value={values.addressLine}
          onChange={(e) => setValues({ ...values, addressLine: e.target.value })}
        />
        <div>
          <input
            id="notes"
            className="field-input"
            maxLength={300}
            value={values.notes}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
            aria-label={copy.delivery.notes}
          />
          <div
            className="mt-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              color: "var(--chalk-dim)",
              opacity: 0.6,
            }}
          >
            {copy.delivery.notes}
          </div>
        </div>
        <div className="mt-4">
          <TextAction type="submit" size="small" disabled={busy}>
            {copy.delivery.send}
          </TextAction>
        </div>
      </form>
      <Serial />
    </main>
  );
}
