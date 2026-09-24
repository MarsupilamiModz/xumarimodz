"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function ReviewForm({ modId }: { modId: string }) {
  const t = useTranslations("review");
  const id = useId();
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-lg border border-line bg-raised p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await submitReview(modId, {
            rating,
            title: fd.get("title") as string,
            content: fd.get("content") as string,
          });
          if (r.success) {
            toast({ title: t("sent") });
            window.location.reload();
          } else toast({ title: t("error"), description: r.error, variant: "destructive" });
        });
      }}
    >
      <h3 className="text-base font-semibold text-ink">{t("title")}</h3>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">{t("ratingLabel")}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t("ratingLabel")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={t("star", { count: n })}
              onClick={() => setRating(n)}
              className="rounded-md p-1 transition-colors duration-fast hover:bg-hover"
            >
              <Star className={`h-5 w-5 ${n <= rating ? "fill-violet-bright text-violet-bright" : "text-ink-muted"}`} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-title`} className="text-sm font-semibold text-ink">{t("headline")}</label>
        <Input id={`${id}-title`} name="title" maxLength={120} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-content`} className="text-sm font-semibold text-ink">{t("text")}</label>
        <Textarea id={`${id}-content`} name="content" rows={4} />
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
