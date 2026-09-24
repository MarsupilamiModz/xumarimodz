"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
// Nur Typen: Werte-Importe aus @prisma/client würden Prisma ins Browser-Bundle ziehen.
import type { ReportCategory, ReportTargetType } from "@prisma/client";
import { submitContentReport } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const CATEGORIES: ReportCategory[] = [
  "MALWARE",
  "BROKEN_FILE",
  "BROKEN_DOWNLOAD",
  "COPYRIGHT",
  "SPAM",
  "SCAM",
  "OFFENSIVE_CONTENT",
  "ABUSIVE",
  "DUPLICATE_CONTENT",
  "STOLEN",
  "FAKE_CREATOR",
  "TOS",
  "OTHER",
];

const selectClass =
  "h-10 w-full rounded-md border border-line-control bg-elevated px-3 text-sm text-ink transition-colors duration-fast hover:border-ink-faint";

export function ReportContentButton({
  targetType,
  targetId,
  label,
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
}) {
  const t = useTranslations("report");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await submitContentReport({ targetType, targetId, category, description });
      if (r.success) {
        toast({ title: t("sent"), description: t("sentText") });
        setOpen(false);
        setDescription("");
      } else {
        toast({ title: t("error"), description: r.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag className="h-4 w-4" aria-hidden />
          {label ?? t("title")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-category`} className="text-sm font-semibold text-ink">{t("category")}</label>
            <select
              id={`${id}-category`}
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className={selectClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`cat.${c}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-description`} className="text-sm font-semibold text-ink">{t("description")}</label>
            <Textarea
              id={`${id}-description`}
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              minLength={10}
              required
            />
          </div>
          <Button type="submit" disabled={pending || description.trim().length < 10} aria-busy={pending}>
            {t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
