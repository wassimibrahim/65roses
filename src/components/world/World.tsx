// <World /> — composes plaster, grain and vignette over any red surface; mounted once in the root layout
import type { ReactNode } from "react";
import { Grain } from "./Grain";
import { Plaster } from "./Plaster";
import { Vignette } from "./Vignette";

export function World({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Plaster />
      <Grain />
      <Vignette />
    </>
  );
}
