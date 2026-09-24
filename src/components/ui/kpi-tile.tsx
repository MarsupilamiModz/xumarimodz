import Link from "next/link";
import { cn } from "@/lib/utils";

/** KPI-Kachel: Label, große Zahl, kleine Zeile darunter; optional komplett verlinkt. */
export function KpiTile({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "warning" | "danger" | "success";
}) {
  const body = (
    <>
      <p className="label-text">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-[26px] font-bold leading-8 tabular-nums",
          tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink"
        )}
      >
        {value}
      </p>
      {hint && <p className="meta mt-1">{hint}</p>}
    </>
  );
  const cls = "block rounded-lg border border-line bg-raised p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors duration-fast hover:border-line-control")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Lade-Skeleton in denselben Maßen wie KpiTile (kein Springen beim Laden). */
export function KpiTileSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-raised p-4" aria-hidden>
      <div className="h-3 w-24 animate-pulse rounded-sm bg-elevated" />
      <div className="mt-2.5 h-7 w-20 animate-pulse rounded-sm bg-elevated" />
      <div className="mt-2 h-3 w-32 animate-pulse rounded-sm bg-elevated" />
    </div>
  );
}
