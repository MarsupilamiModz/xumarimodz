import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold leading-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-violet-soft text-violet-bright",
        secondary: "border-transparent bg-elevated text-ink-muted",
        outline: "border-line text-ink-muted",
        premium: "border-transparent bg-violet-soft text-violet-bright",
        free: "border-line text-ink-muted",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        destructive: "border-transparent bg-danger-soft text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
