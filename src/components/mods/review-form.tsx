"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function ReviewForm({ modId }: { modId: string }) {
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="rounded-xl p-4 space-y-3"
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
            toast({ title: "Review submitted" });
            window.location.reload();
          } else toast({ title: "Error", description: r.error, variant: "destructive" });
        });
      }}
    >
      <p className="text-sm font-medium">Leave a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} / 5`}
            aria-pressed={n === rating}
            className="rounded-md p-1 transition-colors duration-fast hover:bg-hover"
          >
            <Star className={`h-5 w-5 ${n <= rating ? "fill-violet-bright text-violet-bright" : "text-ink-muted"}`} aria-hidden />
          </button>
        ))}
      </div>
      <Input name="title" placeholder="Title (optional)" />
      <Textarea name="content" placeholder="Your review..." rows={3} />
      <Button type="submit" size="sm" disabled={pending}>
        Submit review
      </Button>
    </form>
  );
}
