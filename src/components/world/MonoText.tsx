// <MonoText /> — the quiet voice: 0065, 001, 00—05, codes. Wide tracking, small, dimmed.
import type { ElementType, ReactNode } from "react";

export function MonoText({
  as: Tag = "span",
  dim = true,
  children,
  className,
}: {
  as?: ElementType;
  dim?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.8rem",
        letterSpacing: "0.35em",
        color: dim ? "var(--chalk-dim)" : "var(--chalk)",
      }}
    >
      {children}
    </Tag>
  );
}
