// root layout — the two voices and the world (plaster, grain, vignette) attach to every surface here
import "../styles/globals.css";
import type { ReactNode } from "react";
import { chalk, mono } from "@/lib/fonts";
import { World } from "@/components/world/World";

export const metadata = {
  title: "65",
  description: "BEIRUT.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${chalk.variable} ${mono.variable}`}>
      <body>
        <World>{children}</World>
      </body>
    </html>
  );
}
