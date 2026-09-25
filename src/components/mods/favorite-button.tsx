"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/actions/favorites";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  modId,
  initialFavorited = false,
}: {
  modId: string;
  initialFavorited?: boolean;
}) {
  const t = useTranslations("mods");
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="icon"
      disabled={pending}
      aria-label={favorited ? t("unlike") : t("like")}
      aria-pressed={favorited}
      onClick={() =>
        startTransition(async () => {
          const r = await toggleFavorite(modId);
          if (r.success) {
            setFavorited(r.data.favorited);
            toast({ title: r.data.favorited ? t("favoriteAdded") : t("favoriteRemoved") });
          } else if (r.error === "Unauthorized") {
            toast({ title: t("signInToLike"), variant: "destructive" });
          }
        })
      }
    >
      <Heart className={cn("h-4 w-4", favorited && "fill-violet-bright text-violet-bright")} aria-hidden />
    </Button>
  );
}
