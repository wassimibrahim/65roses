// <Grain /> — fixed full-viewport SVG feTurbulence overlay; the wall's tooth. Rendered once via <World>.
export function Grain() {
  return (
    <svg
      className="world-layer"
      style={{ opacity: "var(--grain-opacity)", mixBlendMode: "overlay" }}
      aria-hidden="true"
    >
      <filter id="grain-65">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-65)" />
    </svg>
  );
}
