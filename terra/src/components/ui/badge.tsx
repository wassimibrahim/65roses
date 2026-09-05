import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 py-px text-[10px] leading-4 font-medium",
  {
    variants: {
      tone: {
        neutral: "border-rule bg-paper text-graphite",
        quiet: "border-transparent bg-transparent text-stone",
        outline: "border-rule bg-transparent text-graphite",
        ink: "border-ink bg-ink text-ivory",
        forest: "border-forest/25 bg-forest-soft text-forest",
        burgundy: "border-burgundy/25 bg-burgundy-soft text-burgundy",
        gold: "border-gold/30 bg-gold-soft text-amber",
      },
      mono: { true: "font-mono tracking-wider uppercase text-[9.5px]", false: "" },
    },
    defaultVariants: { tone: "neutral", mono: false },
  },
);

export function Badge({
  className,
  tone,
  mono,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, mono }), className)} {...props} />;
}

export { badgeVariants };
