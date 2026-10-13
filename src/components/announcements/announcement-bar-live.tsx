"use client";

import { useEffect, useState } from "react";
import { useNavUser } from "@/lib/nav-user-client";
import type { AnnouncementKind } from "@/lib/announcement-targeting";
import { AnnouncementBar, type AnnouncementBarItem } from "@/components/announcements/announcement-bar";

/** Gäste-Liste aus dem (gecachten) HTML; Angemeldete bekommen ihre Zielgruppen-Liste nachgeladen. */
export function AnnouncementBarLive({
  initialItems,
  kindLabels,
  moreLabel,
  className,
}: {
  initialItems: AnnouncementBarItem[];
  kindLabels: Record<AnnouncementKind, string>;
  moreLabel: string;
  className?: string;
}) {
  const { status, user } = useNavUser();
  const [items, setItems] = useState(initialItems);
  const userId = status === "user" ? user.id : null;

  useEffect(() => {
    if (!userId) {
      setItems(initialItems);
      return;
    }
    let active = true;
    fetch("/api/announcements", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<AnnouncementBarItem[]>) : null))
      .then((data) => {
        if (active && data) setItems(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, initialItems]);

  if (items.length === 0) return null;
  return (
    <div className={className}>
      <AnnouncementBar items={items} kindLabels={kindLabels} moreLabel={moreLabel} />
    </div>
  );
}
