"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart, MessageSquare } from "lucide-react";
import { youTubeEmbedUrl } from "@/lib/tutorials/youtube";
import { toggleTutorialLike, postTutorialComment } from "@/actions/tutorials";
import { formatNumber } from "@/lib/format-locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";

type Tutorial = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  type: string;
  youtubeVideoId: string | null;
  videoUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  avgWatchSec: number;
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    user: { username: string; displayName: string | null; avatarUrl: string | null };
  }[];
};

/** Titel und Beschreibung setzt die Seite (PageHeader); hier Kennzahlen, Medien, Inhalt und Kommentare. */
export function TutorialDetail({ locale, tutorial }: { locale: string; tutorial: Tutorial }) {
  const t = useTranslations("publicPages.tutorial");
  const [pending, startTransition] = useTransition();
  const [likes, setLikes] = useState(tutorial.likeCount);
  const [comment, setComment] = useState("");

  const hasVideo =
    (tutorial.type === "YOUTUBE" || tutorial.type === "MIXED") && tutorial.youtubeVideoId;
  const hasHostedVideo =
    (tutorial.type === "VIDEO" || tutorial.type === "MIXED") && tutorial.videoUrl;

  return (
    <article className="space-y-6">
      <div className="meta flex flex-wrap items-center gap-x-4 gap-y-2 tabular-nums">
        <span>{t("views", { count: tutorial.viewCount, value: formatNumber(tutorial.viewCount, locale) })}</span>
        <span>{t("likes", { count: likes, value: formatNumber(likes, locale) })}</span>
        <span>{t("comments", { count: tutorial.commentCount, value: formatNumber(tutorial.commentCount, locale) })}</span>
        {tutorial.avgWatchSec > 0 ? <span>{t("avgWatch", { seconds: Math.round(tutorial.avgWatchSec) })}</span> : null}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await toggleTutorialLike(tutorial.id);
              if (r.success) setLikes((n) => (r.data.liked ? n + 1 : n - 1));
            })
          }
        >
          <Heart className="h-4 w-4" aria-hidden /> {t("like")}
        </Button>
      </div>

      {hasVideo ? (
        <div className="card-surface aspect-video overflow-hidden">
          <iframe
            title={tutorial.title}
            src={youTubeEmbedUrl(tutorial.youtubeVideoId!)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {hasHostedVideo ? (
        <div className="card-surface overflow-hidden">
          <video controls preload="metadata" className="w-full" src={tutorial.videoUrl!} />
        </div>
      ) : null}

      {tutorial.content ? (
        <div className="card-surface p-5">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{tutorial.content}</div>
        </div>
      ) : null}

      <SectionCard title={t("commentsTitle")}>
        <div className="space-y-3">
          <label htmlFor="tutorial-comment" className="sr-only">
            {t("commentLabel")}
          </label>
          <Textarea
            id="tutorial-comment"
            placeholder={t("commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            size="sm"
            disabled={pending || comment.trim().length < 2}
            onClick={() =>
              startTransition(async () => {
                const r = await postTutorialComment(tutorial.id, comment);
                if (r.success) {
                  setComment("");
                  toast({ title: "toast.commentSent" });
                } else toast({ title: r.error, variant: "destructive" });
              })
            }
          >
            {t("commentSubmit")}
          </Button>
        </div>
        {tutorial.comments.length === 0 ? (
          <p className="meta mt-5 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden />
            {t("noComments")}
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {tutorial.comments.map((c) => (
              <li key={c.id} className="py-3 text-sm">
                <p className="font-medium text-ink">{c.user.displayName ?? c.user.username}</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-muted">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </article>
  );
}
