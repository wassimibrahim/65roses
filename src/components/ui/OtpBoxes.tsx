// <OtpBoxes /> — mono character boxes: auto-advance, paste-aware, one-time-code aware.
// Six for a login code, four at the door.
"use client";

import { useRef } from "react";

export function OtpBoxes({
  value,
  onChange,
  onComplete,
  length = 6,
  large = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  // the door is read at arm's length in the dark
  large?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function put(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    const focusIndex = Math.min(clean.length, length - 1);
    refs.current[focusIndex]?.focus();
    if (clean.length === length) onComplete?.(clean);
  }

  return (
    <div className={large ? "flex gap-4" : "flex gap-3"}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="field-input text-center"
          style={
            large
              ? { width: "3.6rem", letterSpacing: 0, fontSize: "2.6rem" }
              : { width: "2.2rem", letterSpacing: 0, fontSize: "1.4rem" }
          }
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
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
