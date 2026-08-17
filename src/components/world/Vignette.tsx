// <Vignette /> — the single permitted gradient: a soft radial darkening of the edges
export function Vignette() {
  return (
    <div
      className="world-layer"
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, transparent 52%, rgba(10, 7, 8, 0.5) 100%)",
      }}
      aria-hidden="true"
    />
  );
}
