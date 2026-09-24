import * as React from "react";
import { cn } from "@/lib/utils";

/** Gemeinsame Klassen für Input, Textarea und Select-Trigger. */
export const controlClassName =
  "w-full rounded-md border border-line-control bg-elevated px-3 text-sm text-ink transition-colors duration-fast placeholder:text-ink-faint hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        controlClassName,
        "flex h-9 py-1.5 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
