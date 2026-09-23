import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-violet text-violet-on hover:bg-violet-hover",
        destructive: "bg-danger text-canvas hover:bg-danger/90",
        outline: "border border-line-control bg-transparent text-ink hover:bg-hover",
        secondary: "border border-line bg-elevated text-ink hover:bg-hover",
        ghost: "text-ink-muted hover:bg-hover hover:text-ink",
        link: "h-auto px-0 text-violet-bright underline-offset-4 hover:underline",
        // Veraltet: entspricht jetzt dem Primär-Button
        neon: "bg-violet text-violet-on hover:bg-violet-hover",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
