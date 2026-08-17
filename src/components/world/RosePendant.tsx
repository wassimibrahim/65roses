// <RosePendant /> — the Rose, rendered. Matte antique gold, one sculptural form, never shiny.
//
// SLOT: this SVG is a stand-in. To replace with the real object later, keep the
// exported name and props and swap the internals for a photograph (next/image,
// same width) or a WebGL render. Everything around it treats this as a black box.
export function RosePendant({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {/* the cord loop */}
      <path
        d="M60 8 C 55 8 52 12 52 16 C 52 21 56 24 60 24 C 64 24 68 21 68 16 C 68 12 65 8 60 8 Z"
        stroke="var(--gold)"
        strokeWidth="2.5"
        fill="none"
        opacity="0.8"
      />
      {/* the bloom — one closed sculptural form, matte */}
      <path
        d="M60 28
           C 42 28 30 42 30 58
           C 30 78 44 92 60 96
           C 76 92 90 78 90 58
           C 90 42 78 28 60 28 Z"
        fill="var(--gold)"
        opacity="0.92"
      />
      {/* carved petal lines — darker gold, matte relief */}
      <g stroke="#7a5f33" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M63 58 C 64 54 60 51 56.5 53 C 53 55 53.5 60 58 61.5 C 63 63 67 59 66 54 C 65 48.5 58 46.5 52.5 50" />
        <path d="M52.5 50 C 46 54 44.5 63 49.5 69 C 54 74.5 63 75.5 69 71 C 75 66.5 76 57 71 51" />
        <path d="M45 42 C 36.5 49 34 62 39.5 71.5" />
        <path d="M75 42.5 C 82 48.5 85 58 82 67" />
      </g>
    </svg>
  );
}
