// The door, in one hand, in the dark, on bad reception.
//
// Everything on this screen is either very large or very small. Search runs
// against the cached list, so typing never waits for the network; only letting
// someone in touches the server, and when it can't, the entry is held and sent
// the moment the signal comes back.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DoorEntry, DoorState } from "@/lib/door/roster";
import { copy } from "@/content/copy";
import { ChalkText } from "@/components/world/ChalkText";
import { MonoText } from "@/components/world/MonoText";
import { TextAction } from "@/components/ui/TextAction";
import { OtpBoxes } from "@/components/ui/OtpBoxes";
import { Reveal } from "@/components/ui/Reveal";
import { heldEntries, hold, loadState, release, saveState, type HeldEntry } from "./cache";

type Verdict =
  | "IN"
  | "ALREADY_IN"
  | "NOT_ON_LIST"
  | "NOT_PAID"
  | "ASK_A_HOST"
  | "LOCKED"
  | "USED"
  | "CLOSED"
  | "NOT_ISSUED"
  | "WRONG";

type View =
  | { at: "search" }
  | { at: "entry"; entry: DoorEntry }
  | { at: "verdict"; verdict: Verdict; enteredAt?: string; entry: DoorEntry }
  | { at: "manual" };

const t = copy.door;

// a host reads three lines at a glance, never a sentence
const VERDICT_LINE: Record<Verdict, string> = {
  IN: t.youreIn,
  ALREADY_IN: t.alreadyIn,
  NOT_ON_LIST: t.notOnTheList,
  NOT_PAID: t.notPaid,
  ASK_A_HOST: t.askAHost,
  LOCKED: t.askAHost,
  USED: t.alreadyIn,
  CLOSED: t.askAHost,
  NOT_ISSUED: t.sendDoorCode,
  WRONG: copy.errors.wrongCode,
};

// the world keeps 24-hour time — 00—05, never 12:42 AM
const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function matches(entry: DoorEntry, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  const digits = needle.replace(/\D/g, "");
  return (
    (digits.length >= 3 && entry.last4.includes(digits)) ||
    (digits.length >= 3 && entry.memberNumber.includes(digits)) ||
    `${entry.firstName} ${entry.lastName}`.toLowerCase().includes(needle)
  );
}

export function DoorApp({ initial }: { initial: DoorState }) {
  const [state, setState] = useState<DoorState>(initial);
  const [view, setView] = useState<View>({ at: "search" });
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [online, setOnline] = useState(true);
  const [held, setHeld] = useState(0);
  const [sent, setSent] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  // ── the shell survives a reload with no signal ──
  useEffect(() => {
    navigator.serviceWorker?.register("/door-sw.js").catch(() => {
      // an old browser simply loses the reload case; everything else still works
    });
  }, []);

  // ── the cache ──
  useEffect(() => {
    saveState(initial);
    loadState().then((cached) => {
      if (cached && cached.at > initial.at) setState(cached);
    });
  }, [initial]);

  const countHeld = useCallback(async () => {
    const rows = await heldEntries();
    setHeld(rows?.length ?? 0);
  }, []);

  // ── send anything held, then refresh the list ──
  const sync = useCallback(async () => {
    const rows = (await heldEntries()) ?? [];
    for (const row of rows) {
      const ok = await fetch("/api/door/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: row.subject,
          id: row.id,
          reason: row.reason,
          offlineAt: row.offlineAt,
        }),
      })
        .then((r) => r.ok)
        .catch(() => false);
      if (ok) await release(row.key);
    }
    await countHeld();

    const fresh = await fetch("/api/door/state")
      .then((r) => (r.ok ? (r.json() as Promise<DoorState>) : null))
      .catch(() => null);
    if (fresh) {
      setState(fresh);
      saveState(fresh);
      setOnline(true);
    } else {
      setOnline(false);
    }
  }, [countHeld]);

  useEffect(() => {
    countHeld();
    const timer = setInterval(sync, 10_000);
    const back = () => sync();
    window.addEventListener("online", back);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", back);
    };
  }, [sync, countHeld]);

  useEffect(() => {
    if (view.at === "search") search.current?.focus();
    if (view.at !== "entry") setCode("");
    if (view.at !== "entry") setSent(false);
  }, [view]);

  const results = useMemo(
    () => (q.trim() ? state.roster.filter((e) => matches(e, q)).slice(0, 12) : []),
    [q, state.roster],
  );

  async function admit(entry: DoorEntry, body: Record<string, unknown>) {
    const result = await fetch("/api/door/enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: entry.subject, id: entry.id, ...body }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ verdict: Verdict; enteredAt?: string }>) : null))
      .catch(() => null);

    if (!result) {
      // no signal: the list says she is expected, so she comes in and the
      // entry waits here until it can be told
      setOnline(false);
      if (!entry.confirmed || entry.askAHost || entry.inside) {
        setView({ at: "verdict", verdict: entry.inside ? "ALREADY_IN" : "ASK_A_HOST", entry });
        return;
      }
      const offlineAt = new Date().toISOString();
      const row: HeldEntry = {
        key: `${entry.subject}:${entry.id}`,
        subject: entry.subject,
        id: entry.id,
        offlineAt,
      };
      await hold(row);
      await countHeld();
      setState((s) => ({
        ...s,
        counts: {
          roses: s.counts.roses + (entry.subject === "ROSE" ? 1 : 0),
          stems: s.counts.stems + (entry.subject === "STEM" ? 1 : 0),
          total: s.counts.total + 1,
        },
        roster: s.roster.map((r) =>
          r.id === entry.id ? { ...r, inside: true, enteredAt: offlineAt } : r,
        ),
      }));
      setView({ at: "verdict", verdict: "IN", enteredAt: offlineAt, entry });
      return;
    }

    setOnline(true);
    setView({ at: "verdict", verdict: result.verdict, enteredAt: result.enteredAt, entry });
    if (result.verdict === "IN") sync();
  }

  // ── screens ──

  if (view.at === "verdict") {
    const line = VERDICT_LINE[view.verdict];
    const time = view.enteredAt ? new Date(view.enteredAt) : null;
    return (
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 text-center"
        onClick={() => setView({ at: "search" })}
      >
        <Reveal>
          <div className="flex flex-col items-center gap-8">
            <ChalkText size="huge">{line}</ChalkText>
            {view.verdict === "ALREADY_IN" && view.entry.enteredAt ? (
              <MonoText>{clock(new Date(view.entry.enteredAt))}</MonoText>
            ) : null}
            {view.verdict === "IN" && time ? <MonoText>{clock(time)}</MonoText> : null}

            {/* the screen is dismissed by tapping it, so anything that acts
                here keeps its tap to itself */}
            <div
              className="flex flex-col items-center gap-8"
              onClick={(event) => event.stopPropagation()}
            >
              {view.verdict === "NOT_ON_LIST" ? (
                <OverrideForm onSubmit={(reason) => admit(view.entry, { reason })} />
              ) : null}
              {view.verdict === "NOT_PAID" ? (
                <TextAction
                  size="small"
                  onClick={async () => {
                    await fetch("/api/door/cash", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: view.entry.id }),
                    }).catch(() => null);
                    await sync();
                    setView({ at: "entry", entry: { ...view.entry, paid: true } });
                  }}
                >
                  {t.markPaid}
                </TextAction>
              ) : null}
              {view.verdict === "WRONG" || view.verdict === "NOT_ISSUED" ? (
                <TextAction size="small" onClick={() => setView({ at: "entry", entry: view.entry })}>
                  {t.back}
                </TextAction>
              ) : null}
            </div>
          </div>
        </Reveal>
      </main>
    );
  }

  if (view.at === "entry") {
    const e = view.entry;
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-12 px-6">
        <Reveal>
          <div className="flex flex-col gap-3">
            <MonoText>{e.subject === "ROSE" ? t.rose : t.stem}</MonoText>
            {e.subject === "ROSE" ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.4em",
                  color: "var(--gold)",
                }}
              >
                {e.memberNumber}
              </span>
            ) : null}
            <ChalkText size="line">
              {e.firstName} {e.lastName}
            </ChalkText>
            <MonoText>
              {e.subject === "ROSE"
                ? `${e.confirmed ? t.confirmed : t.notConfirmed}`
                : `${t.with} ${e.memberNumber} · ${e.paid ? t.paid : t.notPaid}${
                    e.bracelet ? ` · ${t.bracelet} ${e.bracelet}` : ""
                  }`}
            </MonoText>
          </div>
        </Reveal>

        <Reveal>
          <div className="flex flex-col gap-8">
            <ChalkText size="small">{t.showUsItsYou}</ChalkText>
            <OtpBoxes
              length={4}
              large
              value={code}
              onChange={setCode}
              onComplete={(entered) => admit(e, { code: entered })}
            />
            <div className="flex items-center gap-8">
              <TextAction
                variant="quiet"
                size="small"
                onClick={async () => {
                  await fetch("/api/door/code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subject: e.subject, id: e.id }),
                  }).catch(() => null);
                  setSent(true);
                }}
              >
                {sent ? t.sent : t.sendDoorCode}
              </TextAction>
              <TextAction variant="quiet" size="small" onClick={() => setView({ at: "search" })}>
                {t.back}
              </TextAction>
            </div>
          </div>
        </Reveal>
      </main>
    );
  }

  if (view.at === "manual") {
    return <ManualEntry onDone={() => setView({ at: "search" })} onSynced={sync} />;
  }

  return (
    <main className="flex min-h-dvh flex-col gap-8 px-6 pt-10">
      <header className="flex flex-col gap-2">
        <ChalkText size="small">{state.event.name}</ChalkText>
        <MonoText>
          {t.rosesInside} {state.counts.roses} · {t.stemsInside} {state.counts.stems} · {t.total}{" "}
          {state.counts.total}
        </MonoText>
        {!online || held > 0 ? (
          <MonoText>
            {!online ? t.offline : ""} {held > 0 ? `${t.queued} ${held}` : ""}
          </MonoText>
        ) : null}
      </header>

      <input
        ref={search}
        className="door-search"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={q}
        onChange={(event) => setQ(event.target.value)}
        aria-label={t.search}
      />

      <div className="flex flex-col">
        {results.map((entry) => (
          <button
            key={`${entry.subject}:${entry.id}`}
            className="door-row"
            onClick={() => setView({ at: "entry", entry })}
          >
            <span>
              {entry.firstName} {entry.lastName}
            </span>
            <span className="door-row-meta">
              {entry.subject === "ROSE" ? entry.memberNumber : t.stem} · {entry.last4}
              {entry.inside ? ` · ${t.alreadyIn}` : ""}
            </span>
          </button>
        ))}
        {q.trim() && results.length === 0 ? (
          <MonoText>{t.nothing}</MonoText>
        ) : null}
      </div>

      <div className="mt-auto pb-10">
        <TextAction variant="quiet" size="small" onClick={() => setView({ at: "manual" })}>
          {t.manualEntry}
        </TextAction>
      </div>
    </main>
  );
}

function OverrideForm({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="flex w-full max-w-xs flex-col gap-5" onClick={(e) => e.stopPropagation()}>
      <input
        className="field-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        aria-label={t.reason}
      />
      <TextAction size="small" disabled={reason.trim().length < 3} onClick={() => onSubmit(reason)}>
        {t.override}
      </TextAction>
    </div>
  );
}

function ManualEntry({ onDone, onSynced }: { onDone: () => void; onSynced: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+961");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = firstName.trim() && phone.trim().length > 6 && reason.trim().length >= 3;

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-8 px-6">
      <ChalkText size="small">{t.manualEntry}</ChalkText>
      <input
        className="field-input"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        aria-label={t.name}
        autoFocus
      />
      <input
        className="field-input"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        aria-label={copy.apply.fields.lastName}
      />
      <input
        className="field-input"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        aria-label={t.phone}
      />
      <input
        className="field-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        aria-label={t.reason}
      />
      <div className="flex items-center gap-8">
        <TextAction
          size="small"
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            await fetch("/api/door/manual", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firstName, lastName, phone, reason }),
            }).catch(() => null);
            onSynced();
            onDone();
          }}
        >
          {t.add}
        </TextAction>
        <TextAction variant="quiet" size="small" onClick={onDone}>
          {t.back}
        </TextAction>
      </div>
    </main>
  );
}
