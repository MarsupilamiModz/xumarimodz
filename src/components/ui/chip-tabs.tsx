import Link from "next/link";
import { cn } from "@/lib/utils";

export type ChipOption = { value: string; label: string; count?: number };

const chipClass = (active: boolean) =>
  cn(
    "inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium transition-colors duration-fast",
    active ? "border-transparent bg-hover text-ink" : "border-line text-ink-muted hover:border-line-control hover:text-ink"
  );

function Count({ value }: { value?: number }) {
  if (value == null) return null;
  return <span className="tabular-nums text-ink-faint">{value}</span>;
}

/**
 * Filter-Chips. Mit `hrefFor` als Links (serverseitige Filter über die URL, aria-current),
 * mit `onChange` als Buttons mit aria-pressed.
 */
export function ChipTabs({
  options,
  value,
  label,
  hrefFor,
  onChange,
  className,
}: {
  options: ChipOption[];
  value: string;
  label: string;
  hrefFor?: (value: string) => string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return hrefFor ? (
          <Link key={o.value} href={hrefFor(o.value)} aria-current={active ? "true" : undefined} className={chipClass(active)}>
            {o.label}
            <Count value={o.count} />
          </Link>
        ) : (
          <button key={o.value} type="button" aria-pressed={active} onClick={() => onChange?.(o.value)} className={chipClass(active)}>
            {o.label}
            <Count value={o.count} />
          </button>
        );
      })}
    </div>
  );
}
