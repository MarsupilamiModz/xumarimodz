import Link from "next/link";
import { AlertTriangle, Megaphone, Sparkles, Wrench } from "lucide-react";
import type { AnnouncementKind } from "@/lib/announcement-targeting";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<AnnouncementKind, { icon: typeof Megaphone; box: string; icon_: string }> = {
  news: { icon: Megaphone, box: "border-violet/30 bg-violet-soft", icon_: "text-violet-bright" },
  update: { icon: Sparkles, box: "border-success/30 bg-success-soft", icon_: "text-success" },
  maintenance: { icon: Wrench, box: "border-warning/30 bg-warning-soft", icon_: "text-warning" },
  warning: { icon: AlertTriangle, box: "border-danger/30 bg-danger-soft", icon_: "text-danger" },
};

export type AnnouncementBarItem = { id: string; title: string; content: string; link: string | null; kind: AnnouncementKind };

/**
 * Ankündigungsleiste der Webseite. Die Art bestimmt Farbe und Symbol; das Art-Wort steht immer dabei
 * (Status nie nur über Farbe). Wird auch als Live-Vorschau im ACP genutzt.
 */
export function AnnouncementBar({
  items,
  kindLabels,
  moreLabel,
  className,
}: {
  items: AnnouncementBarItem[];
  kindLabels: Record<AnnouncementKind, string>;
  moreLabel: string;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((a) => {
        const style = KIND_STYLE[a.kind] ?? KIND_STYLE.news;
        const Icon = style.icon;
        const external = a.link?.startsWith("http");
        return (
          <div key={a.id} role="status" className={cn("flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm", style.box)}>
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.icon_)} aria-hidden />
            <p className="min-w-0 text-ink-muted">
              <span className={cn("mr-2 text-xs font-semibold uppercase tracking-wide", style.icon_)}>{kindLabels[a.kind]}</span>
              <span className="font-semibold text-ink">{a.title}</span> {a.content}
              {a.link && (
                <Link
                  href={a.link}
                  className="link ml-2 font-semibold"
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {moreLabel}
                </Link>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
