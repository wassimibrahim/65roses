// <Choice /> — a small chalk square with a hand-drawn tick; consent and yes/no decisions
"use client";

export function Choice({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="choice"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <svg className="choice-square" width="26" height="26" viewBox="0 0 26 26" fill="none">
        {/* the square, drawn a little unevenly */}
        <path
          d="M4 4.6 L 21.5 3.8 L 22.2 21.6 L 3.6 22.1 Z"
          stroke="var(--chalk)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {checked ? (
          <path
            d="M7 13.5 C 9 15.5 10.5 17.5 11.5 19 C 13.5 14.5 16.5 9.5 20.5 6"
            stroke="var(--chalk)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
      </svg>
      <span>{label}</span>
    </button>
  );
}
