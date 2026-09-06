// <Plaster /> — very-low-opacity large-scale noise under the grain; the wall's unevenness
export function Plaster() {
  return (
    <svg
      className="world-layer"
      style={{ opacity: 0.04, mixBlendMode: "soft-light" }}
      aria-hidden="true"
    >
      <filter id="plaster-65">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#plaster-65)" />
    </svg>
  );
}
