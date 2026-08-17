// <OtpBoxes /> — six mono character boxes: auto-advance, paste-aware, one-time-code aware
"use client";

import { useRef } from "react";

export function OtpBoxes({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function put(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    const focusIndex = Math.min(clean.length, 5);
    refs.current[focusIndex]?.focus();
    if (clean.length === 6) onComplete?.(clean);
  }

  return (
    <div className="flex gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="field-input text-center"
          style={{ width: "2.2rem", letterSpacing: 0, fontSize: "1.4rem" }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={value[i] ?? ""}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            // paste or autofill lands whole codes; typing lands one digit
            put(typed.length > 1 ? typed : value.slice(0, i) + typed + value.slice(i + 1));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              put(value.slice(0, i - 1));
            }
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
