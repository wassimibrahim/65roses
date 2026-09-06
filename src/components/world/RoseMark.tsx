// <RoseMark /> — a rose in one stroke of chalk: inner curl, one loose petal loop, a stem. Never clipart.
export function RoseMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 56 58"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M33.5 26.5 C 34 24 30.5 22.5 28 24.5 C 25.5 26.5 26.5 30.5 30 31 C 34 31.5 36.5 28 35 24 C 33.5 19.5 26.5 18 21.5 21 C 16 24.5 15 32 19.5 37 C 23 40.5 29 41.5 33.5 39.5 C 33 45 31 50.5 28.5 56"
        stroke="var(--chalk)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="12 2.2"
      />
    </svg>
  );
}
