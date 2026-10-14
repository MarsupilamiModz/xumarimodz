"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitOrderRequirements } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { useAppToast } from "@/hooks/use-app-toast";

export function OrderRequirementsForm({
  orderId,
  locale,
  productName,
}: {
  orderId: string;
  locale: string;
  productName: string;
}) {
  const t = useTranslations("common.cx.orderRequirements");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <SectionCard
      title={t("title")}
      description={t.rich("intro", { productName, strong: (chunks) => <strong className="text-ink">{chunks}</strong> })}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          files.forEach((f) => fd.append("order_files", f));

          startTransition(async () => {
            const r = await submitOrderRequirements(orderId, fd, locale);
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            appToast.saved();
            router.push(`/${locale}/dashboard/orders/${orderId}`);
            router.refresh();
          });
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="req-description" className="label-text">{t("projectDescriptionLabel")}</label>
          <Textarea id="req-description" name="projectDescription" required rows={4} placeholder={t("projectDescriptionPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="req-requirements" className="label-text">{t("requirementsLabel")}</label>
          <Textarea id="req-requirements" name="requirements" rows={4} placeholder={t("requirementsPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="req-style" className="label-text">{t("preferredStyleLabel")}</label>
          <Input id="req-style" name="preferredStyle" placeholder={t("preferredStylePlaceholder")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="req-budget" className="label-text">{t("budgetNotesLabel")}</label>
            <Input id="req-budget" name="budgetNotes" placeholder={t("budgetNotesPlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="req-deadline" className="label-text">{t("deadlineLabel")}</label>
            <Input id="req-deadline" name="deadline" type="date" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="req-notes" className="label-text">{t("notesLabel")}</label>
          <Textarea id="req-notes" name="notes" rows={2} placeholder={t("notesPlaceholder")} />
        </div>

        <div
          className="rounded-lg border border-dashed border-line-control p-4 text-center text-sm text-ink-muted"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)].slice(0, 10));
          }}
        >
          <label htmlFor="req-files">{t("uploadHint")}</label>
          <Input
            id="req-files"
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.psd,.zip,.rar,.7z,.pdf"
            className="mt-2"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-left text-xs text-ink">
              {files.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {t("submit")}
        </Button>
      </form>
    </SectionCard>
  );
}
