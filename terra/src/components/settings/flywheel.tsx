/**
 * The Terra flywheel. Not decoration: it is the loop the software exists to
 * institutionalise, and each stage carries the count that proves it is turning.
 */
export function Flywheel({
  stages,
}: {
  stages: { label: string; count: number; unit: string }[];
}) {
  const size = 340;
  const centre = size / 2;
  const radius = 118;

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-8">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-[340px] shrink-0" role="img" aria-label="Terra flywheel">
        <circle cx={centre} cy={centre} r={radius} fill="none" stroke="#e6e2d9" strokeWidth="1" />
        {stages.map((stage, i) => {
          const angle = (i / stages.length) * Math.PI * 2 - Math.PI / 2;
          const x = centre + Math.cos(angle) * radius;
          const y = centre + Math.sin(angle) * radius;
          const labelRadius = radius + 26;
          const lx = centre + Math.cos(angle) * labelRadius;
          const ly = centre + Math.sin(angle) * labelRadius;
          const anchor = Math.abs(Math.cos(angle)) < 0.3 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
          return (
            <g key={stage.label}>
              <circle cx={x} cy={y} r="4" fill="#16181a" />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize="10.5"
                fill="#2b2f33"
                fontFamily="var(--font-inter)"
              >
                {stage.label}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor={anchor}
                fontSize="10"
                fill="#767c80"
                fontFamily="var(--font-mono-num)"
              >
                {stage.count} {stage.unit}
              </text>
            </g>
          );
        })}
        {/* Direction of travel. */}
        <path
          d={`M ${centre + radius - 6} ${centre - 10} L ${centre + radius} ${centre - 2} L ${centre + radius - 6} ${centre + 6}`}
          fill="none"
          stroke="#a4884f"
          strokeWidth="1.2"
        />
        <text
          x={centre}
          y={centre - 4}
          textAnchor="middle"
          fontSize="13"
          fill="#16181a"
          fontFamily="var(--font-serif-display)"
        >
          TERRA
        </text>
        <text
          x={centre}
          y={centre + 12}
          textAnchor="middle"
          fontSize="9"
          fill="#767c80"
          fontFamily="var(--font-mono-num)"
          letterSpacing="0.12em"
        >
          FLYWHEEL
        </text>
      </svg>

      <p className="max-w-sm text-[12px] leading-relaxed text-graphite">
        Every school researched improves the database. Every conversation improves relationship
        intelligence. Every transaction improves valuation intelligence. Every mandate improves
        matching. The purpose of this software is to make that loop turn without depending on
        anyone&apos;s memory.
      </p>
    </div>
  );
}
