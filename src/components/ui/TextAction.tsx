// <TextAction /> — the primary action: chalk text over a hand-drawn line that extends on hover
import Link from "next/link";
import type { ReactNode } from "react";

const SIZE = { line: "clamp(1.3rem, 5.5vw, 1.9rem)", small: "clamp(1rem, 4vw, 1.2rem)" };

function Line({ quiet }: { quiet: boolean }) {
  return (
    <svg className="ta-line" viewBox="0 0 100 7" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M1 4.5 C 18 3 39 5.5 58 3.8 C 74 2.4 90 4.6 99 3.4"
        fill="none"
        stroke={quiet ? "var(--chalk-dim)" : "var(--chalk)"}
        strokeWidth={quiet ? 1.1 : 1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TextAction({
  href,
  onClick,
  type = "button",
  variant = "primary",
  size = "line",
  disabled = false,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "quiet";
  size?: keyof typeof SIZE;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const quiet = variant === "quiet";
  const cls = ["ta", quiet && "ta-quiet", disabled && "ta-disabled", className]
    .filter(Boolean)
    .join(" ");
  const style = { fontSize: SIZE[size] };

  if (href && !disabled) {
    return (
      <Link href={href} className={cls} style={style}>
        <span>{children}</span>
        <Line quiet={quiet} />
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={cls}
      style={style}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      <span>{children}</span>
      <Line quiet={quiet} />
    </button>
  );
}
