// <ChalkText /> — the chalk voice: uppercase, loose tracking, a slight deterministic lean per line
import { Children, type ElementType, type ReactNode } from "react";

type ChalkSize = "huge" | "line" | "small";

const SIZE: Record<ChalkSize, string> = {
  huge: "clamp(3.5rem, 17vw, 8.5rem)",
  line: "clamp(1.6rem, 7vw, 2.6rem)",
  small: "clamp(1rem, 4vw, 1.25rem)",
};

// deterministic per-string rotation in [-0.6, 0.6] degrees — never random, never
// different between server and client renders
function leanFor(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return (h % 1200) / 1000 - 0.6;
}

function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .filter((c): c is string | number => typeof c === "string" || typeof c === "number")
    .join(" ");
}

export function ChalkText({
  as: Tag = "div",
  size = "line",
  children,
  className,
}: {
  as?: ElementType;
  size?: ChalkSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={className}
      style={{
        fontFamily: "var(--font-chalk)",
        fontSize: SIZE[size],
        lineHeight: 1.05,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        rotate: `${leanFor(textOf(children))}deg`,
      }}
    >
      {children}
    </Tag>
  );
}
