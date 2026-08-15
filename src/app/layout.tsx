// root layout — wraps every surface; the world (grain, plaster, vignette) attaches here later
import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "65",
  description: "BEIRUT.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
