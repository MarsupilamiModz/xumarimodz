import { ChevronDown } from "lucide-react";
import type { FaqEntry } from "@/lib/faq";

/** Aufklappbare FAQ-Einträge (native <details>, per Tastatur bedienbar). */
export function FaqList({ entries }: { entries: FaqEntry[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {entries.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown
              className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-base group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="pb-5 pr-9 text-ink-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
