"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { followCollection, unfollowCollection, bulkDownloadCollection } from "@/actions/collections";

export function CollectionActions({
  collectionId,
  modIds,
  initialFollowing,
}: {
  collectionId: string;
  modIds: string[];
  initialFollowing: boolean;
}) {
  const t = useTranslations("publicPages.collections");
  const [pending, startTransition] = useTransition();

  function toggleFollow() {
    startTransition(async () => {
      const r = initialFollowing
        ? await unfollowCollection(collectionId)
        : await followCollection(collectionId);
      if (r.success) window.location.reload();
    });
  }

  function installAll() {
    startTransition(async () => {
      const r = await bulkDownloadCollection(collectionId);
      if (r.success) {
        toast({ title: t("addedToLibrary", { count: r.data.count }) });
        for (const id of modIds) {
          const res = await fetch(`/api/mods/${id}/download?skipDeps=1`, { method: "POST" });
          if (res.ok) {
            const { url } = await res.json();
            window.open(url, "_blank");
          }
        }
      } else toast({ title: r.error, variant: "destructive" });
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pending} onClick={installAll}>
        <Download className="h-4 w-4" aria-hidden />
        {t("downloadAll")}
      </Button>
      <Button variant="outline" disabled={pending} onClick={toggleFollow}>
        {initialFollowing ? t("unfollow") : t("follow")}
      </Button>
    </div>
  );
}
