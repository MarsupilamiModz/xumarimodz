"use client";
import { Play } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type YouTubeEmbedProps = {
  videoId: string;
  title?: string;
  className?: string;
  priority?: boolean;
};

export function YouTubeEmbed({ videoId, title = "YouTube video", className, priority }: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(priority ?? false);

  useEffect(() => {
    if (priority || visible) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, visible]);

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&color=white&playsinline=1`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl border border-border/50",
        "",
        "",
        className
      )}
    >
      {visible ? (
        <iframe
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas/80 text-ink">
            <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
