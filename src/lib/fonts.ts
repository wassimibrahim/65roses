// the two voices — CHALK (marker, uppercase) and MONO (quiet, wide) — exposed as CSS variables
import localFont from "next/font/local";

export const chalk = localFont({
  src: "../../public/fonts/chalk.woff2",
  variable: "--font-chalk",
  display: "swap",
  fallback: ["Marker Felt", "Segoe Print", "Bradley Hand", "cursive"],
});

export const mono = localFont({
  src: "../../public/fonts/mono.woff2",
  variable: "--font-mono",
  display: "swap",
  fallback: ["SFMono-Regular", "Menlo", "Consolas", "monospace"],
});
