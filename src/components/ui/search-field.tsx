import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Suchfeld mit Icon und (unsichtbarem) Label.
 * Ohne JavaScript nutzbar: in einem <form method="get"> sendet es `name` als Suchparameter.
 */
export function SearchField({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = props.id ?? `search-${props.name ?? "q"}`;
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
      <Input id={id} type="search" placeholder={label} {...props} className="pl-9" />
    </div>
  );
}
