// <Serial /> — the tiny 0065 at the bottom of most screens; 40% opacity, optional override
import { MonoText } from "./MonoText";

export function Serial({ number = "0065" }: { number?: string }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 text-center"
      style={{ opacity: 0.4 }}
    >
      <MonoText dim={false}>{number}</MonoText>
    </div>
  );
}
