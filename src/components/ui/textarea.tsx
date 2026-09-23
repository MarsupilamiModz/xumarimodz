import * as React from "react";
import { cn } from "@/lib/utils";
import { controlClassName } from "@/components/ui/input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(controlClassName, "flex min-h-[96px] py-2 leading-relaxed", className)}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
