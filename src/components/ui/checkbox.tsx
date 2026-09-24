"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox als Button mit role="checkbox" und aria-checked (Leertaste schaltet um).
 * Mit `label` wird die Beschriftung klickbar mitgerendert; `name` erzeugt ein verstecktes Formularfeld.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  name,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  name?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const box = (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-violet bg-violet text-violet-on" : "border-line-control bg-elevated hover:border-ink-faint",
        !label && className
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
    </button>
  );

  return (
    <>
      {label ? (
        <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-ink", disabled && "cursor-not-allowed opacity-60", className)}>
          {box}
          {/* Das label leitet Klicks auf den Text selbst an den Button weiter. */}
          <span>{label}</span>
        </label>
      ) : (
        box
      )}
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </>
  );
}
