"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitOrderRequirements } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t.rich("intro", { productName, strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      </div>

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
        <div className="space-y-1">
          <label className="text-sm font-medium">{t("projectDescriptionLabel")}</label>
          <Textarea name="projectDescription" required rows={4} placeholder={t("projectDescriptionPlaceholder")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t("requirementsLabel")}</label>
          <Textarea name="requirements" rows={4} placeholder={t("requirementsPlaceholder")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t("preferredStyleLabel")}</label>
          <Input name="preferredStyle" placeholder={t("preferredStylePlaceholder")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("budgetNotesLabel")}</label>
            <Input name="budgetNotes" placeholder={t("budgetNotesPlaceholder")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t("deadlineLabel")}</label>
            <Input name="deadline" type="date" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t("notesLabel")}</label>
          <Textarea name="notes" rows={2} placeholder={t("notesPlaceholder")} />
        </div>

        <div
          className="rounded-lg border border-dashed border-violet-bright/40 p-4 text-center text-sm text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)].slice(0, 10));
          }}
        >
          <p>{t("uploadHint")}</p>
          <Input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.psd,.zip,.rar,.7z,.pdf"
            className="mt-2"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
          />
          {files.length > 0 && (
            <ul className="mt-2 text-left text-xs space-y-1">
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
    </Card>
  );
}
