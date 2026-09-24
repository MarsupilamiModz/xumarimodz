"use client";

import { useState } from "react";
import { safeIntlNumberFormat } from "@/lib/i18n/safe-locale";

/**
 * Schlankes Balkendiagramm (SVG, ohne Chart-Bibliothek): eine Farbe, letzter Wert heller,
 * dezente Achsen. Tooltips erscheinen bei Maus und Tastaturfokus; die Werte stehen zusätzlich
 * als Tabelle für Screenreader bereit.
 */
export function BarChart({
  data,
  label,
  locale,
}: {
  /** `label` ist die fertig formatierte Beschriftung (z. B. Datum). */
  data: { key: string; label: string; value: number }[];
  label: string;
  locale: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const formatValue = (v: number) => safeIntlNumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(v);
  const formatLabel = (key: string) => data.find((d) => d.key === key)?.label ?? key;
  const max = Math.max(1, ...data.map((d) => d.value));
  const height = 180;
  const gap = data.length > 40 ? 1 : 3;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex h-[180px] flex-col justify-between text-right text-[11px] tabular-nums text-ink-faint" aria-hidden>
          {[...ticks].reverse().map((v) => (
            <span key={v}>{formatValue(v)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${data.length * 10} ${height}`}
          preserveAspectRatio="none"
          className="h-[180px] w-full"
          role="img"
          aria-label={label}
        >
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={0} x2={data.length * 10} y1={height - f * height} y2={height - f * height} className="stroke-line" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          ))}
          {data.map((d, i) => {
            const h = Math.max(d.value > 0 ? 2 : 0, (d.value / max) * (height - 4));
            const last = i === data.length - 1;
            return (
              <rect
                key={d.key}
                x={i * 10 + gap / 2}
                y={height - h}
                width={10 - gap}
                height={h}
                rx={1}
                tabIndex={0}
                aria-label={`${formatLabel(d.key)}: ${formatValue(d.value)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={last || active === i ? "fill-violet-bright outline-none" : "fill-violet outline-none"}
              />
            );
          })}
        </svg>
        {active != null && data[active] && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-elevated px-2 py-1 text-xs text-ink"
            style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
          >
            <span className="text-ink-muted">{formatLabel(data[active].key)}</span>{" "}
            <span className="font-semibold tabular-nums">{formatValue(data[active].value)}</span>
          </div>
        )}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-10 text-[11px] text-ink-faint" aria-hidden>
        <span>{data[0] && formatLabel(data[0].key)}</span>
        <span>{data.at(-1) && formatLabel(data.at(-1)!.key)}</span>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{formatLabel(d.key)}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
