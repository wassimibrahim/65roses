"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The one piece of client JavaScript a print view needs. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer /> {label}
    </Button>
  );
}
