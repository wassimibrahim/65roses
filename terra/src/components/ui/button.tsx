import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-ink text-ivory hover:bg-charcoal",
        outline: "border border-rule bg-ivory text-ink hover:bg-paper",
        ghost: "text-graphite hover:bg-paper hover:text-ink",
        quiet: "text-stone hover:text-ink",
        forest: "bg-forest text-ivory hover:bg-forest/90",
        danger: "border border-burgundy/30 bg-burgundy-soft text-burgundy hover:bg-burgundy/10",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-6 rounded-xs px-2 text-[11px] [&_svg]:size-3",
        default: "h-7.5 rounded-sm px-3 text-[12px] [&_svg]:size-3.5",
        lg: "h-9 rounded-sm px-4 text-[13px] [&_svg]:size-4",
        icon: "size-7 rounded-sm [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
