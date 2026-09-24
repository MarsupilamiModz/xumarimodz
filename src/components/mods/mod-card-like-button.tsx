"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/actions/favorites";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function ModCardLikeButton({
  modId,
  initialFavorited = false,
  className,
}: {
  modId: string;
  initialFavorited?: boolean;
  className?: string;
}) {
  const t = useTranslations("mods");
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={favorited ? t("unlike") : t("like")}
      aria-pressed={favorited}
      disabled={pending}
      className={cn(
        "relative z-10 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas/80",
        "transition-colors duration-fast hover:border-line-control hover:bg-hover disabled:opacity-60",
        className
      )}
      onClick={() => {
        startTransition(async () => {
          const r = await toggleFavorite(modId);
          if (r.success) {
            setFavorited(r.data.favorited);
          } else if (r.error === "Unauthorized") {
            toast({ title: t("signInToLike"), variant: "destructive" });
          }
        });
      }}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors duration-fast",
          favorited ? "fill-violet-bright text-violet-bright" : "text-ink-muted"
        )}
        aria-hidden
      />
    </button>
  );
}
